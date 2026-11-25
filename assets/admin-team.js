// Wahaj admin: «المستخدمين» (accounts and roles) and «سجل التعديلات» (activity, and undoing a publish).
(() => {
  const C = () => window.WahajCore;
  const V = (window.WahajViews = window.WahajViews || {});
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const when = d => d ? new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(d)) : '';
  const ROLE_D = { admin: 'كل حاجة: المحتوى والأسعار والإعدادات والمبيعات والمستخدمين.', editor: 'نصوص وصور الصفحات، والعروض والآراء والمدونة والأسئلة.', sales: 'الطلبات وعروض الأسعار وأكواد الخصم وكروت الإهداء.' };
  async function api(path, opts = {}) {
    const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await C().token()}` }, body: opts.body ? JSON.stringify(opts.body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'حصل خطأ، جرّب تاني');
    return j;
  }
  const say = e => C().toast(e.message || 'حصل خطأ');
  const pass = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('') + '#7';

  // ========== المستخدمين ==========
  let shown = null; // one-time password just created
  V.users = async root => {
    root.innerHTML = '<div class="ad-empty"><p>جارٍ التحميل…</p></div>';
    const { DEMO, S, ROLE_NAME } = C();
    let owners, users;
    try {
      if (DEMO) { owners = [S.user.email.toLowerCase()]; users = Object.values(C().load('wahaj-db-users', {})); }
      else ({ owners, users } = await api('/api/users'));
    } catch (e) { root.innerHTML = `<div class="ad-empty"><h3>ما قدرنا نحمّل المستخدمين</h3><p>${esc(e.message)}</p></div>`; return; }
    const roleSel = (v, attr) => `<select ${attr}>${Object.entries(ROLE_NAME).map(([k, t]) => `<option value="${k}" ${v === k ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
    root.innerHTML = `
      <div class="ad-form">
        <p class="ad-lead">كل شخص يدخل اللوحة بحسابه، ويشوف بس الأقسام اللي تسمح بيها صلاحيته. كل تعديل بيتسجل باسمه في «سجل التعديلات».</p>
        ${shown ? `<div class="ad-pass"><b>اتعمل حساب ${esc(shown.email)} ✓</b>${shown.password ? `<p>كلمة المرور المؤقتة (بتظهر مرة واحدة بس):</p><div class="ad-inrow"><code dir="ltr">${esc(shown.password)}</code><button type="button" class="ad-btn ad-btn--ghost ad-btn--sm" data-a="copy-pass">انسخ</button></div><p class="ad-help">ابعتها له مع رابط اللوحة <span dir="ltr">${esc(location.origin)}/admin/</span>، ويقدر يغيّرها من «نسيت كلمة المرور».</p>` : '<p>الإيميل ده عنده حساب قبل كذا، اتضافت له الصلاحية بس.</p>'}</div>` : ''}
        <section class="ad-card"><h3>مستخدم جديد</h3>
          <div class="ad-grid">
            <label class="ad-f"><span>الإيميل</span><input id="u-email" type="email" dir="ltr" autocomplete="off"></label>
            <label class="ad-f"><span>الاسم</span><input id="u-name"></label>
            <label class="ad-f"><span>الصلاحية</span>${roleSel('sales', 'id="u-role"')}</label>
          </div>
          <ul class="ad-roles">${Object.entries(ROLE_D).map(([k, d]) => `<li><b>${ROLE_NAME[k]}:</b> ${d}</li>`).join('')}</ul>
          <p class="ad-err" id="u-err" hidden></p>
          <button type="button" class="ad-btn ad-btn--primary" data-a="add">إضافة المستخدم</button>
        </section>
        <section class="ad-card"><h3>${owners.length + users.length} حساب</h3>
          <div class="ad-tablewrap"><table class="ad-table"><thead><tr><th>الحساب</th><th>الصلاحية</th><th>الحالة</th><th></th></tr></thead><tbody>
            ${owners.map(e => `<tr><td><b dir="ltr">${esc(e)}</b><small>مالك الموقع</small></td><td>${ROLE_NAME.admin}</td><td><span class="ad-st ad-st--on">فعّال</span></td><td><small>يتغير من إعدادات Vercel</small></td></tr>`).join('')}
            ${users.map(u => `<tr><td><b dir="ltr">${esc(u.email)}</b><small>${esc(u.name || '')}</small></td>
              <td>${roleSel(u.role, `data-role="${esc(u.email)}"`)}</td>
              <td><span class="ad-st ad-st--${u.active === false ? 'off' : 'on'}">${u.active === false ? 'موقوف' : 'فعّال'}</span></td>
              <td class="ad-actions"><button type="button" class="ad-btn ad-btn--ghost ad-btn--sm" data-a="toggle" data-e="${esc(u.email)}" data-on="${u.active === false ? 1 : 0}">${u.active === false ? 'شغّل' : 'أوقف'}</button><button type="button" class="ad-x" data-a="del" data-e="${esc(u.email)}" aria-label="احذف">×</button></td></tr>`).join('')}
          </tbody></table></div>
        </section>
        ${DEMO ? `<section class="ad-card ad-card--demo"><h3>وضع التجربة: جرّب اللوحة بصلاحية</h3><p class="ad-help">عشان تشوف اللوحة زي ما الموظف هيشوفها. ترجع لـ«مدير» من هنا أو من تسجيل الخروج.</p>${roleSel(C().S.me.role, 'id="u-demo-role"')}</section>` : ''}
      </div>`;
    shown = null;
    const err = t => { const x = root.querySelector('#u-err'); x.textContent = t; x.hidden = !t; };
    const store = list => C().keep('wahaj-db-users', Object.fromEntries(list.map(u => [u.email, u])));
    root.onclick = async e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'copy-pass') { const t = root.querySelector('.ad-pass code').textContent; try { await navigator.clipboard.writeText(t); C().toast('اتنسخ ✓'); } catch { C().toast(t); } return; }
      if (a === 'add') {
        err('');
        const email = root.querySelector('#u-email').value.trim().toLowerCase(), name = root.querySelector('#u-name').value.trim(), role = root.querySelector('#u-role').value;
        if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return err('الإيميل غير صحيح.');
        if (owners.includes(email) || users.some(u => u.email === email)) return err('الإيميل ده موجود.');
        b.disabled = true;
        try {
          if (DEMO) { const p = pass(); users.push({ email, name, role, active: true, createdAt: new Date().toISOString() }); store(users); shown = { email, password: p }; C().logAct(`أضاف مستخدم: ${email} (${C().ROLE_NAME[role]})`); }
          else { const r = await api('/api/users', { method: 'POST', body: { action: 'create', email, name, role } }); shown = { email, password: r.password }; }
        } catch (x) { b.disabled = false; return err(x.message); }
        return V.users(root);
      }
      const email = b.dataset.e;
      if (a === 'toggle') {
        const active = b.dataset.on === '1';
        try {
          if (DEMO) { users.find(u => u.email === email).active = active; store(users); C().logAct(`عدّل مستخدم: ${email}`, active ? 'فعّال' : 'موقوف'); }
          else await api('/api/users', { method: 'POST', body: { action: 'update', email, active } });
        } catch (x) { return say(x); }
        return V.users(root);
      }
      if (a === 'del') {
        if (!confirm(`تحذف حساب ${email}؟ ما يقدر يدخل اللوحة تاني.`)) return;
        try {
          if (DEMO) { store(users.filter(u => u.email !== email)); C().logAct(`حذف مستخدم: ${email}`); }
          else await api('/api/users', { method: 'POST', body: { action: 'delete', email } });
        } catch (x) { return say(x); }
        return V.users(root);
      }
    };
    root.onchange = async e => {
      if (e.target.id === 'u-demo-role') { C().keep('wahaj-admin-demo-role', e.target.value); location.hash = 'home'; location.reload(); return; }
      const email = e.target.dataset.role; if (!email) return;
      try {
        if (DEMO) { users.find(u => u.email === email).role = e.target.value; store(users); C().logAct(`عدّل مستخدم: ${email}`, C().ROLE_NAME[e.target.value]); }
        else await api('/api/users', { method: 'POST', body: { action: 'update', email, role: e.target.value } });
        C().toast('اتغيرت الصلاحية ✓');
      } catch (x) { say(x); V.users(root); }
    };
  };

  // ========== سجل التعديلات ==========
  let tab = 'act', who = '';
  V.log = async root => {
    root.innerHTML = '<div class="ad-empty"><p>جارٍ التحميل…</p></div>';
    const { DEMO, S } = C();
    let items = [], versions = null, vErr = '';
    try {
      if (DEMO) items = Object.values(C().load('wahaj-db-log', {}));
      else {
        const m = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
        const s = await m.getDocs(m.query(m.collection(m.getFirestore(S.fbApp), 'log'), m.orderBy('at', 'desc'), m.limit(300)));
        items = s.docs.map(d => d.data());
      }
    } catch { items = []; }
    items.sort((a, b) => String(b.at).localeCompare(a.at));
    if (tab === 'ver' && !DEMO) { try { versions = (await api('/api/history')).versions; } catch (e) { vErr = e.message; } }
    const people = [...new Set(items.map(x => x.email))];
    const list = items.filter(x => !who || x.email === who);
    root.innerHTML = `
      <div class="ad-form">
        <div class="ad-tabs" role="tablist"><button type="button" role="tab" aria-selected="${tab === 'act'}" data-a="tab" data-t="act">النشاط</button><button type="button" role="tab" aria-selected="${tab === 'ver'}" data-a="tab" data-t="ver">نسخ المحتوى</button></div>
        ${tab === 'act' ? `
          <section class="ad-card">
            <div class="ad-list__h"><h3>${list.length} عملية</h3>${people.length > 1 ? `<select id="lg-who"><option value="">كل الناس</option>${people.map(p => `<option value="${esc(p)}" ${p === who ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>` : ''}</div>
            <ul class="ad-log">${list.map(x => `<li><span class="ad-log__t">${when(x.at)}</span><b>${esc(x.what)}</b>${x.detail ? `<small>${esc(x.detail)}</small>` : ''}<span class="ad-log__w" dir="ltr">${esc(x.email)}</span></li>`).join('') || '<li class="ad-help">لسه مافيش نشاط.</li>'}</ul>
          </section>` : `
          <section class="ad-card"><h3>نسخ المحتوى</h3>
            <p class="ad-help">كل «نشر» بيعمل نسخة. لو حد نشر حاجة غلط، اضغط «رجّع اللي قبله» والموقع يرجع زي ما كان قبل النشر ده (خلال دقيقة). التراجع نفسه بيتسجل كنسخة جديدة، فتقدر ترجع عنه كمان.</p>
            ${DEMO ? '<div class="ad-note">في وضع التجربة النسخ مش متاحة، لأنها بتتحفظ في مستودع الموقع على GitHub. هتشتغل أول ما اللوحة تتربط بالحسابات.</div>'
              : vErr ? `<p class="ad-err">${esc(vErr)}</p>`
              : `<ul class="ad-log">${(versions || []).map((v, i) => `<li><span class="ad-log__t">${when(v.at)}</span><b>${esc(v.message.replace(/^لوحة التحكم: /, ''))}</b>${i === 0 ? '<small>النسخة الحالية</small>' : ''}<button type="button" class="ad-btn ad-btn--ghost ad-btn--sm" data-a="undo" data-sha="${esc(v.sha)}" data-m="${esc(v.message)}">رجّع اللي قبله</button></li>`).join('') || '<li class="ad-help">مافيش نسخ لسه.</li>'}</ul>`}
          </section>`}
      </div>`;
    root.onclick = async e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'tab') { tab = b.dataset.t; return V.log(root); }
      if (b.dataset.a === 'undo') {
        if (!confirm(`ترجع الموقع لما كان عليه قبل: «${b.dataset.m.replace(/^لوحة التحكم: /, '')}»؟`)) return;
        b.disabled = true; b.textContent = 'جارٍ التراجع…';
        try { await api('/api/history', { method: 'POST', body: { sha: b.dataset.sha } }); C().toast('تم التراجع ✓ الموقع هيتحدّث خلال دقيقة.'); } catch (x) { say(x); }
        return V.log(root);
      }
    };
    root.onchange = e => { if (e.target.id === 'lg-who') { who = e.target.value; V.log(root); } };
  };
})();
