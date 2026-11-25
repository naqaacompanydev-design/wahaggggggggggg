// Wahaj admin: «أكواد الخصم»، «كروت الإهداء»، «عروض الأسعار»، «الطلبات».
// These are live business records, so they save at once (no «انشر»): to Firestore when the admin is connected,
// or to this device in demo mode (the calculator and quote page read the same demo data on this device).
(() => {
  const C = () => window.WahajCore;
  const V = (window.WahajViews = window.WahajViews || {});
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = n => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(+n || 0);
  const today = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
  const plusDays = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  const day = d => d ? new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d)) : '—';
  const when = d => d ? new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(d)) : '';
  const rand = (n, abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789') => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => abc[b % abc.length]).join('');
  const services = () => ((C().S.base.pricing || {}).services || []);
  const wa = () => ((C().S.base.settings || {}).whatsapp || '0550771338').replace(/^0/, '966');
  // copy, or show the text so it can be copied by hand when the browser does not allow it
const copy = async t => { try { await navigator.clipboard.writeText(t); C().toast('اتنسخ ✓'); } catch { try { prompt('انسخ:', t); } catch { C().toast(t); } } };

  // ---------- storage: Firestore, or this device in demo mode ----------
  let fsm = null, db = null;
  async function fs() {
    if (!fsm) { fsm = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'); db = fsm.getFirestore(C().S.fbApp); }
    return fsm;
  }
  const local = col => C().load(`wahaj-db-${col}`, {});
  const DB = {
    async all(col) {
      if (C().DEMO) return local(col);
      const m = await fs(); const s = await m.getDocs(m.collection(db, col));
      return Object.fromEntries(s.docs.map(d => [d.id, d.data()]));
    },
    async put(col, id, obj) {
      if (C().DEMO) { const a = local(col); a[id] = obj; if (!C().keep(`wahaj-db-${col}`, a)) throw new Error('space'); return; }
      const m = await fs(); await m.setDoc(m.doc(db, col, id), obj);
    },
    async del(col, id) {
      if (C().DEMO) { const a = local(col); delete a[id]; C().keep(`wahaj-db-${col}`, a); return; }
      const m = await fs(); await m.deleteDoc(m.doc(db, col, id));
    },
    async exists(col, id) { if (C().DEMO) return !!local(col)[id]; const m = await fs(); return (await m.getDoc(m.doc(db, col, id))).exists(); },
    async nextNo() { // Q-2026-0001, one counter for the year
      const y = new Date().getFullYear();
      if (C().DEMO) { const c = C().load('wahaj-db-counter', {}); c[y] = (c[y] || 0) + 1; C().keep('wahaj-db-counter', c); return `Q-${y}-${String(c[y]).padStart(4, '0')}`; }
      const m = await fs(); const ref = m.doc(db, 'counters', `quotes-${y}`);
      const n = await m.runTransaction(db, async t => { const d = await t.get(ref); const v = (d.exists() ? d.data().n : 0) + 1; t.set(ref, { n: v }); return v; });
      return `Q-${y}-${String(n).padStart(4, '0')}`;
    }
  };
  const act = (w, d = '') => C().logAct(w, d);
  const fail = e => C().toast(e && e.message === 'space' ? 'المساحة على الجهاز امتلت.' : 'ما اتحفظش. تأكد من الإنترنت وجرب تاني.');
  const loading = root => { root.innerHTML = '<div class="ad-empty"><p>جارٍ التحميل…</p></div>'; };

  // ========== أكواد الخصم ==========
  const cpStatus = c => c.active === false ? ['موقوف', 'off'] : c.end && today() > c.end ? ['انتهى', 'off'] : c.start && today() < c.start ? ['لسه ما بدأ', 'wait'] : c.maxUses && (c.uses || 0) >= c.maxUses ? ['خلص', 'off'] : ['فعّال', 'on'];
  const cpText = c => c.type === 'percent' ? `${c.value}%${c.max ? ` (بحد أقصى ${c.max} ريال)` : ''}` : `${c.value} ريال`;
  V.coupons = async root => {
    loading(root);
    let all; try { all = await DB.all('coupons'); } catch { root.innerHTML = '<div class="ad-empty"><h3>ما قدرنا نحمّل الأكواد</h3><p>تأكد من الإنترنت وحدّث الصفحة.</p></div>'; return; }
    const list = Object.entries(all).sort((a, b) => String(b[1].createdAt || '').localeCompare(a[1].createdAt || ''));
    const demo = ((C().S.dataPend.pricing || C().S.base.pricing || {}).coupons || []);
    root.innerHTML = `
      <div class="ad-form">
        <p class="ad-lead">الأكواد بتتحقق على السيرفر، ومحدش يقدر يشوف قائمتها من الموقع. كل كود بيتحسب استخدامه لما العميل يرسل طلبه. <b>بيتحفظ على طول</b>.</p>
        ${demo.length ? `<div class="ad-note"><b>${demo.length} أكواد تجريبية</b> لسه ظاهرة في الحاسبة تحت «للتجربة» (${demo.map(c => esc(c.code)).join('، ')}). <button type="button" class="ad-link" data-a="demo-off">شيلها من الحاسبة</button></div>` : ''}
        <section class="ad-card"><h3>كود جديد</h3>
          <div class="ad-grid">
            <label class="ad-f"><span>الكود</span><div class="ad-inrow"><input id="cp-code" dir="ltr" maxlength="20" placeholder="RAMADAN25" style="text-transform:uppercase"><button type="button" class="ad-btn ad-btn--ghost ad-btn--sm" data-a="gen">ولّد</button></div></label>
            <label class="ad-f"><span>وصف يشوفه العميل</span><input id="cp-label" placeholder="خصم 10% على الطلب"></label>
            <label class="ad-f"><span>نوع الخصم</span><select id="cp-type"><option value="percent">نسبة %</option><option value="amount">مبلغ ثابت (ريال)</option></select></label>
            <label class="ad-f ad-f--num"><span>قيمة الخصم</span><input id="cp-value" type="number" min="1" inputmode="decimal" placeholder="10"></label>
            <label class="ad-f ad-f--num"><span>أقصى خصم بالريال (اختياري)</span><input id="cp-max" type="number" min="0" inputmode="decimal"></label>
            <label class="ad-f ad-f--num"><span>أقل مبلغ للطلب</span><input id="cp-min" type="number" min="0" inputmode="decimal" value="0"></label>
            <label class="ad-f"><span>يبدأ من (اختياري)</span><input id="cp-start" type="date"></label>
            <label class="ad-f"><span>ينتهي في (اختياري)</span><input id="cp-end" type="date"></label>
            <label class="ad-f ad-f--num"><span>عدد مرات الاستخدام (فاضي = بدون حد)</span><input id="cp-uses" type="number" min="1" inputmode="numeric"></label>
            <label class="ad-f ad-f--num"><span>كم كود تبي؟</span><input id="cp-count" type="number" min="1" max="200" value="1" inputmode="numeric"><small class="ad-f__help">أكثر من 1 = أكواد عشوائية تبدأ بالكود اللي فوق</small></label>
            <div class="ad-f ad-f--wide"><span>على خدمات معينة؟ (لو ما اخترت شي = كل الخدمات)</span><div class="ad-checks">${services().map(s => `<label><input type="checkbox" class="cp-svc" value="${esc(s.id)}">${esc(s.name)}</label>`).join('')}</div></div>
          </div>
          <p class="ad-err" id="cp-err" hidden></p>
          <button type="button" class="ad-btn ad-btn--primary" data-a="create">إنشاء الكود</button>
        </section>
        <section class="ad-card"><div class="ad-list__h"><h3>${list.length} كود</h3></div>
          ${list.length ? `<div class="ad-tablewrap"><table class="ad-table"><thead><tr><th>الكود</th><th>الخصم</th><th>الاستخدام</th><th>وفّر للعملاء</th><th>المدة</th><th>الحالة</th><th></th></tr></thead><tbody>
            ${list.map(([id, c]) => { const [st, cls] = cpStatus(c); return `<tr>
              <td><b dir="ltr">${esc(id)}</b><small>${esc(c.label || '')}</small></td>
              <td>${cpText(c)}${c.min ? `<small>من ${fmt(c.min)} ريال</small>` : ''}${c.services && c.services.length ? `<small>${c.services.map(x => esc((services().find(s => s.id === x) || {}).name || x)).join('، ')}</small>` : ''}</td>
              <td>${c.uses || 0}${c.maxUses ? ` / ${c.maxUses}` : ''}</td><td>${fmt(c.totalOff || 0)} ريال</td>
              <td><small>${c.start ? day(c.start) : 'الآن'} ← ${c.end ? day(c.end) : 'مفتوح'}</small></td>
              <td><span class="ad-st ad-st--${cls}">${st}</span></td>
              <td class="ad-actions"><button type="button" class="ad-btn ad-btn--ghost ad-btn--sm" data-a="link" data-id="${esc(id)}">انسخ الرابط</button><button type="button" class="ad-btn ad-btn--ghost ad-btn--sm" data-a="toggle" data-id="${esc(id)}">${c.active === false ? 'شغّل' : 'أوقف'}</button><button type="button" class="ad-x" data-a="del" data-id="${esc(id)}" aria-label="احذف">×</button></td></tr>`; }).join('')}
          </tbody></table></div>` : '<p class="ad-help">مافيش أكواد لسه.</p>'}
        </section>
      </div>`;
    const err = t => { const e = root.querySelector('#cp-err'); e.textContent = t; e.hidden = !t; };
    root.onclick = async e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a, id = b.dataset.id;
      if (a === 'gen') { root.querySelector('#cp-code').value = rand(8); return; }
      if (a === 'demo-off') { const S = C().S; const p = JSON.parse(JSON.stringify(S.dataPend.pricing || S.base.pricing)); p.coupons = []; S.dataPend.pricing = p; C().saveData(); C().toast('اتشالت من مسودة الأسعار. اضغط «انشر التعديلات» عشان تختفي من الحاسبة.'); return V.coupons(root); }
      if (a === 'link') return copy(`${location.origin}/price-calculator/?coupon=${id}`);
      if (a === 'toggle') { const c = all[id]; c.active = c.active === false; try { await DB.put('coupons', id, c); } catch (x) { return fail(x); } act(`${c.active ? 'شغّل' : 'أوقف'} كود الخصم ${id}`); return V.coupons(root); }
      if (a === 'del') { if (!confirm(`تحذف الكود ${id}؟ الطلبات اللي استخدمته ما تتأثر.`)) return; try { await DB.del('coupons', id); } catch (x) { return fail(x); } act(`حذف كود الخصم ${id}`); return V.coupons(root); }
      if (a === 'create') {
        err('');
        const v = s => root.querySelector(s).value.trim();
        let code = v('#cp-code').toUpperCase().replace(/[^A-Z0-9-]/g, '');
        const type = v('#cp-type'), value = +v('#cp-value'), count = Math.max(1, Math.min(200, +v('#cp-count') || 1));
        if (count === 1 && code.length < 3) return err('اكتب الكود (3 حروف على الأقل) أو اضغط «ولّد».');
        if (!(value > 0) || (type === 'percent' && value > 100)) return err(type === 'percent' ? 'النسبة لازم تكون من 1 لـ 100.' : 'اكتب قيمة الخصم.');
        if (v('#cp-start') && v('#cp-end') && v('#cp-end') < v('#cp-start')) return err('تاريخ الانتهاء قبل تاريخ البداية.');
        const base = { type, value, max: +v('#cp-max') || null, min: +v('#cp-min') || 0, start: v('#cp-start'), end: v('#cp-end'), maxUses: +v('#cp-uses') || null,
          services: [...root.querySelectorAll('.cp-svc:checked')].map(x => x.value), label: v('#cp-label') || (type === 'percent' ? `خصم ${value}%` : `خصم ${value} ريال`), uses: 0, totalOff: 0, active: true, createdAt: new Date().toISOString() };
        const codes = count === 1 ? [code] : Array.from({ length: count }, () => `${code ? code + '-' : ''}${rand(6)}`);
        b.disabled = true;
        try {
          for (const c of codes) { if (await DB.exists('coupons', c)) { b.disabled = false; return err(`الكود ${c} موجود قبل كذا.`); } }
          for (const c of codes) await DB.put('coupons', c, { ...base, code: c });
        } catch (x) { b.disabled = false; return fail(x); }
        act(count === 1 ? `أنشأ كود الخصم ${codes[0]}` : `أنشأ ${count} كود خصم`, cpText(base));
        C().toast(count === 1 ? `اتعمل الكود ${codes[0]} ✓` : `اتعمل ${count} كود ✓`);
        if (count > 1) copy(codes.join('\n'));
        return V.coupons(root);
      }
    };
  };

  // ========== كروت الإهداء ==========
  const gcStatus = g => g.status === 'void' ? ['ملغي', 'off'] : g.expires && today() > g.expires ? ['منتهي', 'off'] : !(g.balance > 0) ? ['مستخدم بالكامل', 'off'] : g.balance < g.amount ? ['مستخدم جزئيًا', 'wait'] : ['فعّال', 'on'];
  const cardUrl = (id, g) => { const p = new URLSearchParams({ f: g.from || 'وهج', t: g.to || '', o: g.occasion || 'none', c: id, v: String(g.amount) }); if (g.message) p.set('m', g.message); return `${location.origin}/gift/card/?${p}`; };
  V.gifts = async root => {
    loading(root);
    let all; try { all = await DB.all('giftcards'); } catch { root.innerHTML = '<div class="ad-empty"><h3>ما قدرنا نحمّل الكروت</h3><p>تأكد من الإنترنت وحدّث الصفحة.</p></div>'; return; }
    const list = Object.entries(all).sort((a, b) => String(b[1].createdAt || '').localeCompare(a[1].createdAt || ''));
    const occ = ((C().S.base.gift || {}).occasions || []);
    root.innerHTML = `
      <div class="ad-form">
        <p class="ad-lead">كارت بمبلغ: صاحبه يكتب الكود في الحاسبة، والرصيد بيتخصم من طلبه لوحده لحد ما يخلص. <b>بيتحفظ على طول</b>.</p>
        <section class="ad-card"><h3>كارت جديد</h3>
          <div class="ad-grid">
            <label class="ad-f ad-f--num"><span>المبلغ (ريال)</span><input id="gc-amount" type="number" min="1" inputmode="decimal" placeholder="300"></label>
            <label class="ad-f"><span>من (اسم صاحب الإهداء)</span><input id="gc-from" placeholder="سارة"></label>
            <label class="ad-f"><span>إلى (اسم المُهدى له)</span><input id="gc-to" placeholder="نورة"></label>
            <label class="ad-f"><span>جوال المُهدى له (اختياري)</span><input id="gc-phone" dir="ltr" inputmode="tel" placeholder="05XXXXXXXX"></label>
            <label class="ad-f"><span>المناسبة</span><select id="gc-occ">${occ.map(o => `<option value="${esc(o.id)}">${esc(o.emoji)} ${esc(o.label)}</option>`).join('')}</select></label>
            <label class="ad-f"><span>صالح حتى</span><input id="gc-exp" type="date" value="${plusDays(365)}"></label>
            <label class="ad-f ad-f--wide"><span>رسالة الكارت (اختياري)</span><textarea class="ad-ta" rows="2" id="gc-msg"></textarea></label>
          </div>
          <p class="ad-err" id="gc-err" hidden></p>
          <button type="button" class="ad-btn ad-btn--primary" data-a="create">إنشاء الكارت</button>
        </section>
        <section class="ad-card"><div class="ad-list__h"><h3>${list.length} كارت</h3></div>
          ${list.length ? `<div class="ad-tablewrap"><table class="ad-table"><thead><tr><th>الكود</th><th>إلى</th><th>المبلغ</th><th>الرصيد</th><th>صالح حتى</th><th>الحالة</th><th></th></tr></thead><tbody>
            ${list.map(([id, g]) => { const [st, cls] = gcStatus(g); return `<tr>
              <td><b dir="ltr">${esc(id)}</b><small>من ${esc(g.from || '')}</small></td><td>${esc(g.to || '')}${g.phone ? `<small dir="ltr">${esc(g.phone)}</small>` : ''}</td>
              <td>${fmt(g.amount)} ريال</td><td><b>${fmt(g.balance)}</b> ريال${(g.used || []).length ? `<small>${g.used.map(u => esc(u.order)).join('، ')}</small>` : ''}</td>
              <td><small>${day(g.expires)}</small></td><td><span class="ad-st ad-st--${cls}">${st}</span></td>
              <td class="ad-actions"><button type="button" class="ad-btn ad-btn--ghost ad-btn--sm" data-a="code" data-id="${esc(id)}">انسخ الكود</button>
                ${g.phone ? `<a class="ad-btn ad-btn--ghost ad-btn--sm" target="_blank" rel="noopener" href="https://wa.me/${esc(g.phone.replace(/^0/, '966'))}?text=${encodeURIComponent(`${g.to}، لك هدية من ${g.from} 🎁\nرصيد ${g.amount} ريال عند وهج لخدمات التنظيف\nافتح كارتك من هنا:\n${cardUrl(id, g)}`)}">أرسل له الكارت</a>` : `<button type="button" class="ad-btn ad-btn--ghost ad-btn--sm" data-a="card" data-id="${esc(id)}">انسخ رابط الكارت</button>`}
                ${g.status !== 'void' ? `<button type="button" class="ad-btn ad-btn--ghost ad-btn--sm" data-a="void" data-id="${esc(id)}">ألغِ</button>` : ''}<button type="button" class="ad-x" data-a="del" data-id="${esc(id)}" aria-label="احذف">×</button></td></tr>`; }).join('')}
          </tbody></table></div>` : '<p class="ad-help">مافيش كروت لسه.</p>'}
        </section>
      </div>`;
    const err = t => { const e = root.querySelector('#gc-err'); e.textContent = t; e.hidden = !t; };
    root.onclick = async e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a, id = b.dataset.id;
      if (a === 'code') return copy(id);
      if (a === 'card') return copy(cardUrl(id, all[id]));
      if (a === 'void') { if (!confirm(`تلغي الكارت ${id}؟ رصيده ما يقدر يستخدمه.`)) return; all[id].status = 'void'; try { await DB.put('giftcards', id, all[id]); } catch (x) { return fail(x); } act(`ألغى كارت الإهداء ${id}`); return V.gifts(root); }
      if (a === 'del') { if (!confirm(`تحذف الكارت ${id} نهائيًا؟`)) return; try { await DB.del('giftcards', id); } catch (x) { return fail(x); } act(`حذف كارت الإهداء ${id}`); return V.gifts(root); }
      if (a === 'create') {
        err('');
        const v = s => root.querySelector(s).value.trim();
        const amount = +v('#gc-amount'), phone = v('#gc-phone').replace(/\D/g, '').replace(/^966/, '0');
        if (!(amount > 0)) return err('اكتب مبلغ الكارت.');
        if (!v('#gc-to')) return err('اكتب اسم المُهدى له.');
        if (phone && !/^05\d{8}$/.test(phone)) return err('الجوال لازم يبدأ بـ 05 ويكون 10 أرقام.');
        let id; do { id = `WG-${rand(4)}-${rand(4)}`; } while (await DB.exists('giftcards', id).catch(() => false));
        const g = { code: id, amount, balance: amount, from: v('#gc-from'), to: v('#gc-to'), phone, occasion: v('#gc-occ'), message: v('#gc-msg'), expires: v('#gc-exp'), status: 'active', used: [], createdAt: new Date().toISOString() };
        b.disabled = true;
        try { await DB.put('giftcards', id, g); } catch (x) { b.disabled = false; return fail(x); }
        act(`أنشأ كارت إهداء ${id}`, `${amount} ريال لـ ${g.to}`);
        C().toast(`اتعمل الكارت ${id} ✓`); copy(id);
        return V.gifts(root);
      }
    };
  };

  // ========== عروض الأسعار ==========
  const qTotal = q => { const sub = (q.items || []).reduce((a, x) => a + (+x.qty || 0) * (+x.price || 0), 0); const d = Math.min(+q.discount || 0, sub); return sub - d + (q.vat ? Math.round((sub - d) * 0.15 * 100) / 100 : 0); };
  const Q_ST = { draft: ['مسودة', 'wait'], sent: ['مُرسل', 'wait'], viewed: ['اتشاف', 'wait'], accepted: ['مقبول', 'on'], rejected: ['مرفوض', 'off'] };
  const qLink = q => `${location.origin}/quote/?id=${q.id}&k=${q.k}`;
  let editing = null;
  V.quotes = async root => {
    if (editing) return quoteEditor(root);
    loading(root);
    let all; try { all = await DB.all('quotes'); } catch { root.innerHTML = '<div class="ad-empty"><h3>ما قدرنا نحمّل العروض</h3><p>تأكد من الإنترنت وحدّث الصفحة.</p></div>'; return; }
    const list = Object.values(all).sort((a, b) => String(b.createdAt || '').localeCompare(a.createdAt || ''));
    root.innerHTML = `
      <div class="ad-form">
        <p class="ad-lead">عرض سعر برقم مسلسل وصفحة بشعار وهج يفتحها العميل من لينك، ويقدر يطبعها PDF ويضغط «أوافق». <b>بيتحفظ على طول</b>.</p>
        <section class="ad-card"><div class="ad-list__h"><h3>${list.length} عرض سعر</h3><button type="button" class="ad-btn ad-btn--primary ad-btn--sm" data-a="new">+ عرض سعر جديد</button></div>
          ${list.length ? `<div class="ad-tablewrap"><table class="ad-table"><thead><tr><th>الرقم</th><th>العميل</th><th>الإجمالي</th><th>التاريخ</th><th>الحالة</th><th></th></tr></thead><tbody>
            ${list.map(q => { const [st, cls] = Q_ST[q.status] || ['—', 'wait']; return `<tr>
              <td><b dir="ltr">${esc(q.no)}</b></td><td>${esc(q.customer)}${q.phone ? `<small dir="ltr">${esc(q.phone)}</small>` : ''}</td>
              <td>${fmt(qTotal(q))} ريال</td><td><small>${day(q.createdAt)}${q.valid ? `<br>صالح حتى ${day(q.valid)}` : ''}</small></td>
              <td><span class="ad-st ad-st--${cls}">${st}</span>${q.acceptedAt ? `<small>${when(q.acceptedAt)}</small>` : ''}</td>
              <td class="ad-actions"><button type="button" class="ad-btn ad-btn--ghost ad-btn--sm" data-a="edit" data-id="${esc(q.id)}">فتح</button><a class="ad-btn ad-btn--ghost ad-btn--sm" href="${esc(qLink(q))}" target="_blank" rel="noopener">شوف الصفحة</a><button type="button" class="ad-btn ad-btn--ghost ad-btn--sm" data-a="dup" data-id="${esc(q.id)}">نسخة</button><button type="button" class="ad-x" data-a="del" data-id="${esc(q.id)}" aria-label="احذف">×</button></td></tr>`; }).join('')}
          </tbody></table></div>` : '<p class="ad-help">مافيش عروض أسعار لسه.</p>'}
        </section>
      </div>`;
    root.onclick = async e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a, q = all[b.dataset.id];
      if (a === 'new') { editing = { id: rand(10, 'abcdefghjkmnpqrstuvwxyz23456789'), k: rand(24, 'abcdefghjkmnpqrstuvwxyz23456789'), no: '', customer: '', phone: '', items: [{ label: '', qty: 1, price: 0 }], discount: 0, vat: false, notes: '', valid: plusDays(14), status: 'draft', isNew: true }; return quoteEditor(root); }
      if (a === 'edit') { editing = JSON.parse(JSON.stringify(q)); return quoteEditor(root); }
      if (a === 'dup') { editing = { ...JSON.parse(JSON.stringify(q)), id: rand(10, 'abcdefghjkmnpqrstuvwxyz23456789'), k: rand(24, 'abcdefghjkmnpqrstuvwxyz23456789'), no: '', status: 'draft', acceptedAt: null, viewedAt: null, valid: plusDays(14), isNew: true }; return quoteEditor(root); }
      if (a === 'del') { if (!confirm(`تحذف عرض السعر ${q.no}؟`)) return; try { await DB.del('quotes', q.id); } catch (x) { return fail(x); } act(`حذف عرض السعر ${q.no}`); return V.quotes(root); }
    };
  };
  function quoteEditor(root) {
    const q = editing;
    const row = (x, i) => `<div class="ad-qrow"><input data-q="label" data-i="${i}" value="${esc(x.label)}" placeholder="البند، مثال: تنظيف فيلا دورين"><input data-q="qty" data-i="${i}" type="number" min="0" step="any" inputmode="decimal" value="${esc(x.qty)}" aria-label="الكمية"><input data-q="price" data-i="${i}" type="number" min="0" step="any" inputmode="decimal" value="${esc(x.price)}" aria-label="السعر"><b>${fmt((+x.qty || 0) * (+x.price || 0))}</b><button type="button" class="ad-x" data-a="del-row" data-i="${i}" aria-label="احذف البند">×</button></div>`;
    root.innerHTML = `
      <div class="ad-form">
        <button type="button" class="ad-link" data-a="back">← كل عروض الأسعار</button>
        <section class="ad-card"><h3>${q.no ? `عرض سعر ${esc(q.no)}` : 'عرض سعر جديد'} ${q.status !== 'draft' ? `<span class="ad-st ad-st--${(Q_ST[q.status] || [])[1]}">${(Q_ST[q.status] || [])[0]}</span>` : ''}</h3>
          <div class="ad-grid">
            <label class="ad-f"><span>اسم العميل أو الشركة</span><input data-f="customer" value="${esc(q.customer)}"></label>
            <label class="ad-f"><span>جوال العميل</span><input data-f="phone" dir="ltr" inputmode="tel" value="${esc(q.phone)}" placeholder="05XXXXXXXX"></label>
            <label class="ad-f"><span>صالح حتى</span><input data-f="valid" type="date" value="${esc(q.valid)}"></label>
          </div>
        </section>
        <section class="ad-card"><h3>البنود</h3>
          <div class="ad-qhead"><span>البند</span><span>الكمية</span><span>السعر</span><span>الإجمالي</span><span></span></div>
          <div id="q-rows">${q.items.map(row).join('')}</div>
          <div class="ad-add"><button type="button" class="ad-btn ad-btn--ghost ad-btn--sm" data-a="add-row">+ بند</button>
            <select id="q-svc" aria-label="أضف خدمة"><option value="">+ أضف خدمة من الحاسبة…</option>${services().map(s => `<option value="${esc(s.name)}">${esc(s.name)}</option>`).join('')}</select></div>
          <div class="ad-grid" style="margin-top:14px">
            <label class="ad-f ad-f--num"><span>خصم (ريال)</span><input data-f="discount" type="number" min="0" inputmode="decimal" value="${esc(q.discount)}"></label>
            <label class="ad-switch"><input type="checkbox" data-f="vat" ${q.vat ? 'checked' : ''}><i aria-hidden="true"></i><span><b>إضافة ضريبة القيمة المضافة 15%</b></span></label>
          </div>
          <p class="ad-qtotal">الإجمالي: <b id="q-total">${fmt(qTotal(q))}</b> ريال</p>
          <label class="ad-f ad-f--wide"><span>ملاحظات للعميل (اختياري)</span><textarea class="ad-ta" rows="3" data-f="notes" placeholder="مثال: السعر يشمل المواد والمعدات.">${esc(q.notes)}</textarea></label>
        </section>
        <p class="ad-err" id="q-err" hidden></p>
        <div class="ad-add">
          <button type="button" class="ad-btn ad-btn--primary" data-a="save">حفظ</button>
          <button type="button" class="ad-btn ad-btn--ghost" data-a="send"><svg><use href="#a-ext"/></svg>احفظ وأرسل للعميل على واتساب</button>
          ${q.no ? `<button type="button" class="ad-btn ad-btn--ghost" data-a="copy">انسخ الرابط</button><a class="ad-btn ad-btn--ghost" href="${esc(qLink(q))}" target="_blank" rel="noopener">شوف الصفحة</a>` : ''}
        </div>
      </div>`;
    const total = () => { root.querySelector('#q-total').textContent = fmt(qTotal(q)); };
    root.oninput = e => {
      const el = e.target;
      if (el.dataset.q) { const i = +el.dataset.i; q.items[i][el.dataset.q] = el.dataset.q === 'label' ? el.value : (el.value === '' ? '' : +el.value); el.parentElement.querySelector('b').textContent = fmt((+q.items[i].qty || 0) * (+q.items[i].price || 0)); total(); }
      if (el.dataset.f) { q[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? +el.value || 0 : el.value; total(); }
    };
    root.onchange = e => {
      if (e.target.type === 'checkbox') root.oninput(e);
      if (e.target.id === 'q-svc' && e.target.value) { q.items.push({ label: e.target.value, qty: 1, price: 0 }); quoteEditor(root); }
    };
    root.onclick = async e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'back') { editing = null; return V.quotes(root); }
      if (a === 'add-row') { q.items.push({ label: '', qty: 1, price: 0 }); return quoteEditor(root); }
      if (a === 'del-row') { q.items.splice(+b.dataset.i, 1); if (!q.items.length) q.items.push({ label: '', qty: 1, price: 0 }); return quoteEditor(root); }
      if (a === 'copy') return copy(qLink(q));
      if (a === 'save' || a === 'send') {
        const err = t => { const x = root.querySelector('#q-err'); x.textContent = t; x.hidden = !t; };
        err('');
        q.items = q.items.filter(x => String(x.label).trim());
        if (!q.customer.trim()) { if (!q.items.length) q.items.push({ label: '', qty: 1, price: 0 }); return err('اكتب اسم العميل.'); }
        if (!q.items.length) { q.items.push({ label: '', qty: 1, price: 0 }); quoteEditor(root); return err('ضيف بند واحد على الأقل.'); }
        const phone = String(q.phone || '').replace(/\D/g, '').replace(/^966/, '0');
        if (a === 'send' && !/^05\d{8}$/.test(phone)) return err('اكتب جوال العميل (05XXXXXXXX) عشان نرسل له.');
        // the WhatsApp tab opens now (before saving) so the browser does not block it
        const tab = a === 'send' ? window.open('about:blank', '_blank') : null;
        b.disabled = true;
        try {
          if (!q.no) q.no = await DB.nextNo();
          if (!q.createdAt) q.createdAt = new Date().toISOString();
          if (a === 'send' && q.status === 'draft') q.status = 'sent';
          const { isNew, ...doc } = q; doc.phone = phone;
          await DB.put('quotes', q.id, doc); delete q.isNew;
        } catch (x) { b.disabled = false; if (tab) tab.close(); return fail(x); }
        if (tab) tab.location.href = `https://wa.me/${phone.replace(/^0/, '966')}?text=${encodeURIComponent(`السلام عليكم ${q.customer}\nعرض السعر رقم ${q.no} من وهج لخدمات التنظيف:\n${qLink(q)}`)}`;
        act(`${a === 'send' ? 'أرسل' : 'حفظ'} عرض السعر ${q.no}`, `${q.customer} · ${fmt(qTotal(q))} ريال`);
        C().toast(`اتحفظ عرض السعر ${q.no} ✓`);
        return quoteEditor(root);
      }
    };
  }

  // ========== الطلبات ==========
  const O_ST = { new: ['جديد', 'new'], confirmed: ['اتأكد', 'wait'], done: ['اتنفذ', 'on'], cancelled: ['اتلغى', 'off'] };
  let oFilter = 'all', oSearch = '', oOpen = null;
  V.orders = async root => {
    loading(root);
    let all; try { all = await DB.all('orders'); } catch { root.innerHTML = '<div class="ad-empty"><h3>ما قدرنا نحمّل الطلبات</h3><p>تأكد من الإنترنت وحدّث الصفحة.</p></div>'; return; }
    const draw = () => {
      const list = Object.values(all).sort((a, b) => String(b.createdAt || '').localeCompare(a.createdAt || ''));
      const counts = list.reduce((m, o) => (m[o.status || 'new'] = (m[o.status || 'new'] || 0) + 1, m), {});
      const s = oSearch.trim();
      const shown = list.filter(o => (oFilter === 'all' || (o.status || 'new') === oFilter) && (!s || [o.id, o.name, o.district, o.city, (o.giftTo || {}).name].join(' ').includes(s)));
      root.innerHTML = `
        <div class="ad-form">
          <p class="ad-lead">كل طلب بيترسل من الحاسبة بيتسجل هنا (والعميل بيرسله على واتساب كمان). رقم الطلب مكتوب أول رسالة الواتساب.</p>
          <div class="ad-obar">
            <div class="ad-tabs">${[['all', 'الكل', list.length], ...Object.entries(O_ST).map(([k, [t]]) => [k, t, counts[k] || 0])].map(([k, t, n]) => `<button type="button" aria-selected="${oFilter === k}" data-a="f" data-f="${k}">${t} <small>${n}</small></button>`).join('')}</div>
            <input class="ad-search" id="o-q" type="search" placeholder="ابحث برقم الطلب أو الاسم أو الحي" value="${esc(oSearch)}">
            <button type="button" class="ad-btn ad-btn--ghost ad-btn--sm" data-a="refresh">تحديث</button>
          </div>
          <ul class="ad-list">${shown.map(o => { const [st, cls] = O_ST[o.status || 'new'] || O_ST.new; const open = oOpen === o.id; return `<li class="ad-li${open ? ' is-open' : ''}">
            <div class="ad-li__row"><button type="button" class="ad-li__t" data-a="open" data-id="${esc(o.id)}" aria-expanded="${open}"><b><span dir="ltr">${esc(o.id)}</span> · ${esc(o.name || 'بدون اسم')}${o.source === 'gift' ? ' 🎁' : ''}</b><small>${esc(o.items.map(x => x.n).join('، '))} · ${fmt(o.total ?? o.sub)} ريال · ${when(o.createdAt)}</small></button>
              <span class="ad-st ad-st--${cls}">${st}</span></div>
            ${open ? `<div class="ad-li__ed ad-order">
              <dl class="ad-dl">
                ${o.items.map(x => `<div><dt>${esc(x.n)}</dt><dd>${fmt(x.t)} ريال${x.d ? `<small>${esc(x.d)}</small>` : ''}</dd></div>`).join('')}
                ${o.off ? `<div><dt>كوبون <span dir="ltr">${esc(o.couponCode)}</span></dt><dd>− ${fmt(o.off)} ريال</dd></div>` : ''}${o.couponRejected ? `<div><dt>كوبون مرفوض</dt><dd dir="ltr">${esc(o.couponRejected)}</dd></div>` : ''}
                ${o.giftUsed ? `<div><dt>كارت إهداء <span dir="ltr">${esc(o.giftCode)}</span></dt><dd>− ${fmt(o.giftUsed)} ريال</dd></div>` : ''}
                <div class="ad-dl__total"><dt>الإجمالي</dt><dd>${fmt(o.total ?? o.sub)} ريال</dd></div>
                <div><dt>الموعد</dt><dd>${esc(o.date || '—')} ${esc(o.period || '')}</dd></div>
                <div><dt>العنوان</dt><dd>${esc([o.city, o.district && 'حي ' + o.district.replace(/^حي\s+/, '')].filter(Boolean).join('، '))}${o.short ? ` · <span dir="ltr">${esc(o.short)}</span>` : ''}${o.map ? ` · <a href="${esc(o.map)}" target="_blank" rel="noopener">الخريطة</a>` : ''}</dd></div>
                ${o.notes ? `<div><dt>ملاحظات العميل</dt><dd>${esc(o.notes)}</dd></div>` : ''}
                ${o.giftTo ? `<div><dt>🎁 إهداء إلى</dt><dd>${esc(o.giftTo.name)} · <span dir="ltr">${esc(o.giftTo.phone)}</span>${o.giftTo.occasion ? ` · ${esc(o.giftTo.occasion)}` : ''}${o.giftTo.message ? `<small>«${esc(o.giftTo.message)}»</small>` : ''}</dd></div>` : ''}
              </dl>
              <div class="ad-grid">
                <label class="ad-f"><span>حالة الطلب</span><select data-st="${esc(o.id)}">${Object.entries(O_ST).map(([k, [t]]) => `<option value="${k}" ${(o.status || 'new') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
                <label class="ad-f ad-f--wide"><span>ملاحظة داخلية (ما يشوفها العميل)</span><textarea class="ad-ta" rows="2" data-note="${esc(o.id)}">${esc(o.adminNote || '')}</textarea></label>
              </div>
              ${o.giftTo && o.giftTo.phone ? `<a class="ad-btn ad-btn--ghost ad-btn--sm" target="_blank" rel="noopener" href="https://wa.me/${esc(o.giftTo.phone.replace(/^0/, '966'))}">واتساب المُهدى له</a>` : ''}
              <button type="button" class="ad-x" data-a="del" data-id="${esc(o.id)}" aria-label="احذف الطلب">×</button>
            </div>` : ''}</li>`; }).join('') || '<li class="ad-help">مافيش طلبات هنا.</li>'}</ul>
        </div>`;
    };
    draw();
    let noteT;
    root.onclick = async e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'f') { oFilter = b.dataset.f; return draw(); }
      if (a === 'refresh') return V.orders(root);
      if (a === 'open') { oOpen = oOpen === b.dataset.id ? null : b.dataset.id; return draw(); }
      if (a === 'del') { if (!confirm(`تحذف الطلب ${b.dataset.id} نهائيًا؟`)) return; try { await DB.del('orders', b.dataset.id); } catch (x) { return fail(x); } act(`حذف الطلب ${b.dataset.id}`); delete all[b.dataset.id]; return draw(); }
    };
    root.onchange = async e => {
      const id = e.target.dataset.st; if (!id) return;
      all[id].status = e.target.value; all[id].statusAt = new Date().toISOString();
      try { await DB.put('orders', id, all[id]); act(`غيّر حالة الطلب ${id}`, O_ST[e.target.value][0]); C().toast('اتحدّثت الحالة ✓'); } catch (x) { fail(x); }
      draw();
    };
    root.oninput = e => {
      if (e.target.id === 'o-q') { oSearch = e.target.value; const pos = e.target.selectionStart; draw(); const i = root.querySelector('#o-q'); i.focus(); i.setSelectionRange(pos, pos); return; }
      const id = e.target.dataset.note; if (!id) return;
      all[id].adminNote = e.target.value;
      clearTimeout(noteT); noteT = setTimeout(() => DB.put('orders', id, all[id]).catch(fail), 700);
    };
  };
})();
