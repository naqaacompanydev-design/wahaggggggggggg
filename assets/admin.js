// Wahaj admin: sign in, edit any page's text and images in place, publish.
// Publishing sends the edits to /api/save, which stores them in data/content.json (and new images in assets/uploads/)
// in the site's repository; Vercel then rebuilds the site. In demo mode (no Firebase settings) edits stay on this device.
(async () => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const keep = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

  const CFG = window.WAHAJ_FIREBASE;
  const DEMO = !CFG || !CFG.apiKey;
  const S = { user: null, view: 'home', pages: [], page: null, device: 'pc', pend: load('wahaj-admin-pending', []), imgs: new Map(), pick: null };
  const demoStore = () => load('wahaj-admin-demo', { shell: { ar: {}, en: {} }, pages: {} });
  // settings and prices: the saved version (base) and the unpublished draft (dataPend)
  S.base = {}; S.dataPend = load('wahaj-admin-data-pending', {});
  const DATA_NAME = { settings: 'الإعدادات العامة', pricing: 'الخدمات والأسعار', offers: 'العروض', reviews: 'آراء العملاء', partners: 'شركاء النجاح', portfolio: 'معرض الأعمال', posts: 'المدونة', faq: 'الأسئلة الشائعة', gift: 'مناسبات الإهداء' };

  // ---------- sections ----------
  const NAV = [
    { g: 'المحتوى', items: [
      { id: 'home', ic: 'a-home', t: 'الرئيسية' },
      { id: 'pages', ic: 'a-page', t: 'الصفحات', p: 'content', d: 'اضغط على أي نص أو صورة في أي صفحة وغيّره.' },
      { id: 'settings', ic: 'a-gear', t: 'الإعدادات العامة', p: 'settings', d: 'الأرقام، الإيميل، السوشيال، الشعار، الألوان، التقسيط.' },
      { id: 'services', ic: 'a-box', t: 'الخدمات والأسعار', p: 'pricing', d: 'خدمات الحاسبة وأسعارها وأسئلتها والأحياء والمواعيد.' },
      { id: 'offers', ic: 'a-tag', t: 'العروض', p: 'lists', d: 'عروض الرئيسية وصفحة العروض.' },
      { id: 'reviews', ic: 'a-star', t: 'آراء العملاء', p: 'lists', d: 'الآراء ولينك التقييم على جوجل.' },
      { id: 'partners', ic: 'a-users', t: 'شركاء النجاح', p: 'lists', d: 'شعارات الشركاء في الشريط المتحرك.' },
      { id: 'portfolio', ic: 'a-img', t: 'معرض الأعمال', p: 'lists', d: 'صور قبل وبعد.' },
      { id: 'posts', ic: 'a-doc', t: 'المدونة', p: 'lists', d: 'مقالات بصفحة لكل مقال.' },
      { id: 'faq', ic: 'a-page', t: 'الأسئلة الشائعة', p: 'lists', d: 'مجموعات الأسئلة والإجابات.' },
      { id: 'gift', ic: 'a-gift', t: 'مناسبات الإهداء', p: 'lists', d: 'مناسبات ورسائل كارت الإهداء.' }
    ] },
    { g: 'المبيعات', items: [
      { id: 'orders', ic: 'a-inbox', t: 'الطلبات', p: 'sales', d: 'كل طلب جاي من الحاسبة وحالته.' },
      { id: 'quotes', ic: 'a-doc', t: 'عروض الأسعار', p: 'sales', d: 'عرض سعر برابط وPDF وموافقة العميل.' },
      { id: 'coupons', ic: 'a-tag', t: 'أكواد الخصم', p: 'sales', d: 'أكواد تتحقق على السيرفر مع عدّاد استخدام.' },
      { id: 'gifts', ic: 'a-gift', t: 'كروت الإهداء', p: 'sales', d: 'كروت بمبلغ ورصيد يتخصم من الحاسبة.' }
    ] },
    { g: 'الحساب', items: [
      { id: 'users', ic: 'a-users', t: 'المستخدمين', p: 'users', d: 'حسابات الموظفين وصلاحياتهم.' },
      { id: 'log', ic: 'a-undo', t: 'سجل التعديلات', p: 'log', d: 'مين عدّل إيه وإمتى، والرجوع لنسخة قبل أي نشر.' }
    ] }
  ];
  // roles (the server decides; this only hides what someone can't use)
  const PERMS = { admin: ['content', 'lists', 'settings', 'pricing', 'sales', 'users', 'log'], editor: ['content', 'lists'], sales: ['sales'] };
  const ROLE_NAME = { admin: 'مدير', editor: 'محرر محتوى', sales: 'مبيعات' };
  const can = p => !p || (S.me && S.me.perms.includes(p));
  const canPublish = () => ['content', 'lists', 'settings', 'pricing'].some(can);
  const navItem = id => NAV.flatMap(g => g.items).find(i => i.id === id);

  // ---------- sign in ----------
  let auth = null, fb = null;
  async function startAuth() {
    $('#ad-demo-note').hidden = !DEMO;
    if (DEMO) { const u = load('wahaj-admin-demo-user', null); return u ? enter(u) : showLogin(); }
    try {
      const app = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
      fb = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      S.fbApp = app.initializeApp(CFG);
      auth = fb.getAuth(S.fbApp);
      fb.onAuthStateChanged(auth, u => (u ? enter({ email: u.email }) : showLogin()));
    } catch { showLogin(); loginErr('تعذّر الاتصال بخدمة الدخول. تأكد من الإنترنت وحدّث الصفحة.'); }
  }
  function showLogin() { $('#ad-app').hidden = true; $('#ad-login').hidden = false; $('#ad-email').focus(); }
  const loginErr = t => { const e = $('#ad-login-err'); e.textContent = t; e.hidden = !t; };
  $('#ad-login-form').addEventListener('submit', async e => {
    e.preventDefault(); loginErr('');
    const email = $('#ad-email').value.trim(), pass = $('#ad-pass').value;
    if (!email || !pass) return loginErr('اكتب الإيميل وكلمة المرور.');
    const b = $('#ad-login-btn'); b.disabled = true; b.textContent = 'جارٍ الدخول…';
    try {
      if (DEMO) { keep('wahaj-admin-demo-user', { email }); enter({ email }); }
      else await fb.signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      const c = err && err.code;
      loginErr(c === 'auth/too-many-requests' ? 'محاولات كثيرة. استنى شوية وجرب تاني.' : c === 'auth/network-request-failed' ? 'مافيش اتصال بالإنترنت.' : 'الإيميل أو كلمة المرور غلط.');
    }
    b.disabled = false; b.textContent = 'دخول';
  });
  $('#ad-forgot').addEventListener('click', async () => {
    const email = $('#ad-email').value.trim();
    if (!email) return loginErr('اكتب إيميلك أول، وبعدين اضغط «نسيت كلمة المرور».');
    if (DEMO) return loginErr('في وضع التجربة مافيش كلمة مرور.');
    try { await fb.sendPasswordResetEmail(auth, email); loginErr(''); toast('بعتنا لك رابط تغيير كلمة المرور على الإيميل.'); }
    catch { loginErr('ما قدرنا نبعت الرابط. تأكد من الإيميل.'); }
  });
  $('#ad-logout').addEventListener('click', async () => {
    if (S.pend.length && !confirm('عندك تعديلات لم تُنشر. تبي تطلع؟ (التعديلات تفضل محفوظة على الجهاز ده)')) return;
    if (DEMO) { localStorage.removeItem('wahaj-admin-demo-user'); localStorage.removeItem('wahaj-admin-demo-role'); showLogin(); } // demo: signing out also resets the test role else await fb.signOut(auth);
  });

  async function enter(u) {
    S.user = u;
    if (DEMO) { const r = load('wahaj-admin-demo-role', 'admin'); S.me = { role: r, roleName: ROLE_NAME[r], perms: PERMS[r] }; }
    else {
      try {
        const r = await fetch('/api/me', { headers: { Authorization: `Bearer ${await auth.currentUser.getIdToken()}` } });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { await fb.signOut(auth); showLogin(); return loginErr(j.error || 'الحساب ده ما عنده صلاحية على لوحة التحكم.'); }
        S.me = j;
      } catch { showLogin(); return loginErr('ما قدرنا نتحقق من حسابك. تأكد من الإنترنت.'); }
    }
    $('#ad-login').hidden = true; $('#ad-app').hidden = false;
    $('#ad-user').innerHTML = `${esc(u.email)}<small>${esc(S.me.roleName)}</small>`;
    $('#ad-publish').hidden = !canPublish();
    $('#ad-demo').hidden = !DEMO;
    try { S.pages = await (await fetch('/_edit/pages.json', { cache: 'no-store' })).json(); } catch { S.pages = []; }
    for (const k of Object.keys(DATA_NAME)) { try { S.base[k] = await (await fetch(`/data/${k}.json`, { cache: 'no-store' })).json(); } catch { S.base[k] = null; } }
    if (DEMO) Object.assign(S.base, load('wahaj-admin-demo-data', {}));
    renderNav();
    go(location.hash.slice(1) || 'home');
    updatePend();
  }

  // ---------- layout ----------
  function renderNav() {
    $('#ad-nav').innerHTML = NAV.map(g => ({ ...g, items: g.items.filter(i => can(i.p)) })).filter(g => g.items.length).map(g => `<p class="ad-nav__g">${g.g}</p>` + g.items.map(i =>
      `<a href="#${i.id}" data-go="${i.id}" class="ad-nav__i"><svg><use href="#${i.ic}"/></svg><span>${i.t}</span>${i.soon ? '<em>قريبًا</em>' : ''}</a>`).join('')).join('');
  }
  function go(id) {
    let it = navItem(id) || navItem('home');
    if (!can(it.p)) it = navItem('home');
    S.view = it.id;
    document.querySelectorAll('.ad-nav__i').forEach(a => a.classList.toggle('is-on', a.dataset.go === it.id));
    $('#ad-title').textContent = it.t;
    document.body.classList.remove('nav-open'); $('#ad-scrim').hidden = true;
    const vw = $('#ad-view'); vw.oninput = vw.onchange = vw.onclick = null; // each screen sets its own
    if (it.id === 'home') return viewHome();
    if (it.id === 'pages') return viewPages();
    if (window.WahajViews && window.WahajViews[it.id]) return window.WahajViews[it.id]($('#ad-view'));
    viewSoon(it);
  }
  addEventListener('hashchange', () => S.user && go(location.hash.slice(1)));
  $('#ad-menu').addEventListener('click', () => { document.body.classList.add('nav-open'); $('#ad-scrim').hidden = false; });
  $('#ad-scrim').addEventListener('click', () => { document.body.classList.remove('nav-open'); $('#ad-scrim').hidden = true; });

  function viewHome() {
    const mine = NAV.flatMap(g => g.items).filter(i => i.id !== 'home' && can(i.p));
    const first = can('content') ? ['pages', 'a-page', 'عدّل الصفحات'] : ['orders', 'a-inbox', 'شوف الطلبات'];
    $('#ad-view').innerHTML = `
      <div class="ad-home">
        <section class="ad-hello">
          <div><h3>أهلًا بك 👋</h3><p>${can('content') ? 'من هنا تعدّل أي نص أو صورة في الموقع. افتح «الصفحات»، اختر الصفحة، واضغط على أي كلمة تكتب مكانها أو على أي صورة تغيّرها. لما تخلص اضغط «انشر التعديلات» ويظهر التغيير في الموقع خلال دقيقة.' : 'من هنا تتابع الطلبات وعروض الأسعار وأكواد الخصم وكروت الإهداء. كل اللي تعمله بيتحفظ على طول.'}</p><span class="ad-tag ad-tag--b">صلاحيتك: ${esc(S.me.roleName)}</span></div>
          <a class="ad-btn ad-btn--primary" href="#${first[0]}"><svg><use href="#${first[1]}"/></svg>${first[2]}</a>
        </section>
        ${canPublish() ? `<div class="ad-stats">
          <div class="ad-stat"><b>${S.pages.filter(p => p.lang === 'ar').length}</b><span>صفحة تقدر تعدّلها</span></div>
          <div class="ad-stat"><b>${S.pend.length + Object.keys(S.dataPend).length}</b><span>تعديل لم يُنشر</span></div>
          <div class="ad-stat"><b>${esc(lastPub())}</b><span>آخر نشر</span></div>
        </div>` : ''}
        <h3 class="ad-h3">أقسام اللوحة</h3>
        <div class="ad-soon-grid">${mine.map(i => `<a class="ad-soon-c" href="#${i.id}"><svg><use href="#${i.ic}"/></svg><b>${i.t}</b><p>${i.d}</p></a>`).join('')}</div>
      </div>`;
  }
  function viewSoon(it) {
    $('#ad-view').innerHTML = `<div class="ad-empty"><svg><use href="#${it.ic}"/></svg><h3>${it.t}</h3><p>${it.soon}</p><span class="ad-tag">في المرحلة الجاية من اللوحة</span><a class="ad-btn ad-btn--ghost" href="#pages">ارجع لتعديل الصفحات</a></div>`;
  }
  const lastPub = () => { const t = load('wahaj-admin-last', null); return t ? new Date(t).toLocaleString('ar-SA-u-nu-latn-ca-gregory', { dateStyle: 'medium', timeStyle: 'short' }) : 'لسه'; };

  // ---------- page editor ----------
  const pageName = p => p.id === '/' ? 'الصفحة الرئيسية' : p.id === '/en/' ? 'English home' : p.title;
  function viewPages() {
    const ar = S.pages.filter(p => p.lang === 'ar'), en = S.pages.filter(p => p.lang !== 'ar');
    const opt = p => `<option value="${esc(p.id)}">${esc(pageName(p))}</option>`;
    if (!S.page || !S.pages.some(p => p.id === S.page)) S.page = (ar[0] || S.pages[0] || {}).id;
    $('#ad-view').innerHTML = `
      <div class="ad-ed">
        <div class="ad-ed__bar">
          <label class="ad-ed__sel"><span class="sr-only">الصفحة</span><select id="ad-page">${ar.map(opt).join('')}${en.length ? `<optgroup label="English">${en.map(opt).join('')}</optgroup>` : ''}</select></label>
          <div class="ad-seg" role="group" aria-label="حجم المعاينة">
            <button type="button" data-dev="pc" aria-pressed="${S.device === 'pc'}"><svg><use href="#a-pc"/></svg><span>كمبيوتر</span></button>
            <button type="button" data-dev="m" aria-pressed="${S.device === 'm'}"><svg><use href="#a-phone"/></svg><span>جوال</span></button>
          </div>
          <a class="ad-btn ad-btn--ghost ad-btn--sm" id="ad-live" target="_blank" rel="noopener"><svg><use href="#a-ext"/></svg>افتح في الموقع</a>
        </div>
        <p class="ad-ed__hint"><b>اضغط على أي نص</b> واكتب مكانه، و<b>Enter</b> للحفظ. <b>اضغط على أي صورة</b> تغيّرها. اللي اتعدّل يتعلّم بإطار وردي.</p>
        <div class="ad-ed__stage" data-dev="${S.device}"><iframe id="ad-frame" title="معاينة الصفحة للتعديل"></iframe><div class="ad-ed__load" id="ad-load">جارٍ تحميل الصفحة…</div></div>
      </div>`;
    $('#ad-page').value = S.page;
    $('#ad-page').addEventListener('change', e => openPage(e.target.value));
    document.querySelectorAll('[data-dev]').forEach(b => b.addEventListener('click', () => {
      S.device = b.dataset.dev; $('.ad-ed__stage').dataset.dev = S.device;
      document.querySelectorAll('[data-dev] ').forEach(x => x.tagName === 'BUTTON' && x.setAttribute('aria-pressed', String(x.dataset.dev === S.device)));
    }));
    openPage(S.page);
  }
  function openPage(id) {
    const p = S.pages.find(x => x.id === id); if (!p) return;
    S.page = id;
    $('#ad-live').href = p.id === '/404/' ? '/404.html' : p.id;
    $('#ad-load').hidden = false;
    $('#ad-frame').src = p.edit + (p.edit.includes('?') ? '&' : '?') + 't=' + Date.now();
  }
  const langOf = pageId => (S.pages.find(p => p.id === pageId) || {}).lang || 'ar';
  const cid = c => c.scope === 'shell' ? `shell:${c.lang}:${c.key}` : `${c.page}:${c.key}`;

  // called from inside the page frame
  window.WahajAdmin = {
    ready(page, n) { $('#ad-load').hidden = true; if (!n) toast('الصفحة دي مافيهاش نصوص ثابتة تتعدّل من هنا.'); },
    change(c) {
      c.lang = langOf(c.page);
      const i = S.pend.findIndex(x => cid(x) === cid(c));
      const prev = i > -1 ? S.pend[i] : {};
      const next = { ...prev, ...c, at: Date.now() };
      if (i > -1) S.pend[i] = next; else S.pend.push(next);
      savePend();
    },
    pending(page) {
      const lang = langOf(page);
      const rel = c => (c.scope === 'shell' ? c.lang === lang : c.page === page);
      let list = [];
      if (DEMO) { // demo: published edits live on this device, so show them too
        const d = demoStore();
        for (const [key, v] of Object.entries((d.shell || {})[lang] || {})) list.push({ key, ...v });
        for (const [key, v] of Object.entries((d.pages || {})[page] || {})) list.push({ key, ...v });
      }
      list = list.concat(S.pend.filter(rel).map(c => ({ ...c, preview: c.img ? (S.imgs.get(c.img) || {}).url || c.data : null })));
      return list;
    },
    pickImage(info) { openPicker(info); }
  };

  // ---------- image picker ----------
  function openPicker(info) {
    S.pick = { ...info, file: null };
    $('#ad-img-old').src = info.src || '';
    $('#ad-img-alt').value = info.alt || '';
    $('#ad-img-new').innerHTML = '<svg><use href="#a-img"/></svg><span>اختر صورة</span>';
    $('#ad-img-info').textContent = 'الجديدة';
    $('#ad-img-err').hidden = true;
    $('#ad-img').hidden = false;
  }
  $('#ad-img-pick').addEventListener('click', () => $('#ad-img-file').click());
  $('#ad-img-new').addEventListener('click', () => $('#ad-img-file').click());
  $('#ad-img-file').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    const err = $('#ad-img-err'); err.hidden = true;
    if (!/^image\//.test(f.type)) { err.textContent = 'الملف ده مش صورة.'; err.hidden = false; return; }
    if (f.size > 25 * 1024 * 1024) { err.textContent = 'الصورة كبيرة جدًا (أكبر من 25 ميجا).'; err.hidden = false; return; }
    $('#ad-img-info').textContent = 'جارٍ تجهيز الصورة…';
    try {
      const r = await compress(f);
      S.pick.file = r;
      $('#ad-img-new').innerHTML = `<img src="${r.url}" alt="">`;
      $('#ad-img-info').textContent = `${r.w}×${r.h} · ${Math.round(r.size / 1024)} كيلو`;
    } catch { err.textContent = 'ما قدرنا نقرا الصورة. جرّب صورة JPG أو PNG.'; err.hidden = false; $('#ad-img-info').textContent = 'الجديدة'; }
  });
  $('#ad-img-ok').addEventListener('click', () => {
    const p = S.pick; if (!p) return;
    const alt = $('#ad-img-alt').value.trim();
    if (!p.file && alt === (p.alt || '')) return closeModal();
    const c = { page: p.page, scope: p.scope, key: p.key, o: p.o };
    if (p.file) {
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      S.imgs.set(id, p.file);
      Object.assign(c, { img: id, src: `upload:${id}`, data: p.file.data });
    }
    if (alt !== (p.alt || '')) c.alt = alt;
    window.WahajAdmin.change(c);
    try { $('#ad-frame').contentWindow.WahajEdit.setImage(p.key, p.file ? p.file.url : null, c.alt); } catch {}
    closeModal();
  });
  // resize to 1600px at most and save as WebP, so the site stays fast
  async function compress(file, max = 1600) {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    let blob = await new Promise(r => c.toBlob(r, 'image/webp', 0.82));
    if (!blob || blob.type !== 'image/webp') blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
    const data = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
    return { blob, data, url: URL.createObjectURL(blob), w: c.width, h: c.height, size: blob.size, type: blob.type };
  }
  function closeModal() { $('#ad-img').hidden = true; S.pick = null; }
  document.addEventListener('click', e => { if (e.target.closest('[data-close]')) { closeModal(); $('#ad-changes').hidden = true; } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); $('#ad-changes').hidden = true; } });

  // ---------- pending changes ----------
  function savePend() {
    // images are kept as data so a refresh does not lose them
    if (!keep('wahaj-admin-pending', S.pend)) toast('المساحة على الجهاز امتلت. انشر التعديلات الحالية قبل ما تكمّل.');
    updatePend();
  }
  function saveData() { if (!keep('wahaj-admin-data-pending', S.dataPend)) toast('المساحة على الجهاز امتلت. انشر التعديلات الحالية قبل ما تكمّل.'); updatePend(); }
  function updatePend() {
    const n = S.pend.length + Object.keys(S.dataPend).length;
    $('#ad-pend').hidden = !n; $('#ad-discard').hidden = !n;
    $('#ad-pend').textContent = n === 1 ? 'تعديل واحد لم يُنشر' : `${n} تعديلات لم تُنشر`;
    $('#ad-publish').disabled = !n;
    if (S.view === 'home') { const b = document.querySelectorAll('.ad-stat b')[1]; if (b) b.textContent = n; }
  }
  const where = c => c.scope === 'shell' ? 'الهيدر والفوتر (كل الصفحات)' : pageName(S.pages.find(p => p.id === c.page) || { id: c.page, title: c.page });
  $('#ad-pend').addEventListener('click', () => {
    $('#ad-ch-list').innerHTML = Object.keys(S.dataPend).map(k => `<li><div><small>قسم</small><b>${DATA_NAME[k]}: تعديلات لم تُنشر</b></div><button type="button" class="ad-iconbtn" data-undo-data="${k}" aria-label="تراجع عن التعديل"><svg><use href="#a-undo"/></svg></button></li>`).join('') + S.pend.map((c, i) => `<li>
      <div><small>${esc(where(c))}</small>${c.t != null ? `<b>${esc(c.t)}</b>` : `<b class="ad-ch__img">${c.data ? `<img src="${c.data}" alt="">` : ''}${c.img ? 'صورة جديدة' : ''}${c.alt != null ? ` · الوصف: ${esc(c.alt)}` : ''}</b>`}</div>
      <button type="button" class="ad-iconbtn" data-undo="${i}" aria-label="تراجع عن التعديل"><svg><use href="#a-undo"/></svg></button></li>`).join('');
    $('#ad-changes').hidden = false;
  });
  $('#ad-ch-list').addEventListener('click', e => {
    const bd = e.target.closest('[data-undo-data]');
    if (bd) { delete S.dataPend[bd.dataset.undoData]; saveData(); $('#ad-pend').hidden ? ($('#ad-changes').hidden = true) : $('#ad-pend').click(); if (window.WahajViews && window.WahajViews[S.view]) window.WahajViews[S.view]($('#ad-view')); return; }
    const b = e.target.closest('[data-undo]'); if (!b) return;
    S.pend.splice(+b.dataset.undo, 1); savePend();
    $('#ad-pend').hidden ? ($('#ad-changes').hidden = true) : $('#ad-pend').click();
    if (S.view === 'pages') openPage(S.page);
  });
  $('#ad-discard').addEventListener('click', () => {
    if (!confirm('تلغي كل التعديلات اللي لم تُنشر؟')) return;
    S.pend = []; S.dataPend = {}; saveData(); savePend(); go(S.view);
  });

  // ---------- publish ----------
  $('#ad-publish').addEventListener('click', async () => {
    const b = $('#ad-publish'); if (!S.pend.length && !Object.keys(S.dataPend).length) return;
    const bad = window.WahajCheck && window.WahajCheck(S.dataPend);
    if (bad) { toast(bad); return; }
    b.disabled = true; b.textContent = 'جارٍ النشر…';
    try {
      if (DEMO) {
        const d = demoStore();
        for (const c of S.pend) {
          const bucket = c.scope === 'shell' ? ((d.shell[c.lang] ||= {})) : ((d.pages[c.page] ||= {}));
          const v = { ...(bucket[c.key] || {}), o: c.o };
          if (c.t != null) v.t = c.t;
          if (c.data) v.src = c.data;
          if (c.alt != null) v.alt = c.alt;
          bucket[c.key] = v;
        }
        if (!keep('wahaj-admin-demo', d)) throw new Error('space');
        if (Object.keys(S.dataPend).length) { const dd = load('wahaj-admin-demo-data', {}); for (const [k, v] of Object.entries(S.dataPend)) dd[k] = stripUploads(v); if (!keep('wahaj-admin-demo-data', dd)) throw new Error('space'); Object.assign(S.base, dd); }
        logAct(`نشر: ${[...new Set([...(S.pend.length ? [`${S.pend.length} تعديل`] : []), ...Object.keys(S.dataPend).map(k => DATA_NAME[k])])].join('، ')}`);
        toast('اتحفظ في وضع التجربة. الموقع الحقيقي هيتغير لما نربط اللوحة بالحسابات.');
      } else {
        const token = await auth.currentUser.getIdToken();
        const images = []; const seen = new Set();
        for (const c of S.pend) if (c.img && c.data && !seen.has(c.img)) { seen.add(c.img); images.push({ id: c.img, type: c.data.slice(5, c.data.indexOf(';')), data: c.data.split(',')[1] }); }
        const pushImg = (id, d) => { if (!seen.has(id)) { seen.add(id); images.push({ id, type: d.slice(5, d.indexOf(';')), data: d.split(',')[1] }); } };
        for (const v of Object.values(S.dataPend)) { if (v._upload) pushImg(v._upload.id, v._upload.data); for (const [id, d] of Object.entries(v._uploads || {})) if (JSON.stringify(v).includes(`upload:${id}`)) pushImg(id, d); }
        const data = {}; for (const [k, v] of Object.entries(S.dataPend)) { const { _upload, _uploads, ...rest } = v; data[k] = rest; }
        const edits = S.pend.map(({ page, scope, lang, key, o, t, src, alt }) => ({ page, scope, lang, key, o, t, src, alt }));
        const payload = JSON.stringify({ edits, images, data });
        if (payload.length > 4.2e6) throw new Error('الصور كتير في مرة واحدة. انشر جزء منها الأول وبعدين الباقي.');
        const res = await fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: payload });
        const out = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(out.error || 'save');
        toast('اتنشر ✓ التعديلات هتظهر في الموقع خلال دقيقة تقريبًا.');
      }
      keep('wahaj-admin-last', Date.now());
      if (!DEMO) for (const [k, v] of Object.entries(S.dataPend)) { const { _upload, _uploads, ...rest } = v; S.base[k] = rest; }
      S.pend = []; S.imgs.clear(); S.dataPend = {}; saveData(); savePend();
      if (S.view === 'pages') openPage(S.page); else go(S.view);
    } catch (e) {
      toast(e.message === 'space' ? 'المساحة على الجهاز امتلت في وضع التجربة.' : e.message && e.message !== 'save' ? `ما اتنشرش: ${e.message}` : 'ما اتنشرش. تأكد من الإنترنت وجرب تاني، وتعديلاتك لسه محفوظة.');
    }
    b.textContent = 'انشر التعديلات'; updatePend();
  });
  addEventListener('beforeunload', e => { if (S.pend.length && !DEMO) { e.preventDefault(); e.returnValue = ''; } });

  // demo: an uploaded image is kept as data so it still shows after publishing
  function stripUploads(v) {
    const map = { ...(v._uploads || {}) }; if (v._upload) map[v._upload.id] = v._upload.data;
    const { _upload, _uploads, ...rest } = v;
    const walk = x => typeof x === 'string' ? (/^upload:(.+)$/.test(x) ? map[x.slice(7)] || '' : x) : Array.isArray(x) ? x.map(walk) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, y]) => [k, walk(y)])) : x;
    return walk(rest);
  }

  // activity log: this device in demo mode, Firestore otherwise (sales screens call it too)
  async function logAct(what, detail = '') {
    const e = { at: new Date().toISOString(), email: (S.user && S.user.email || '').toLowerCase(), what, detail };
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    if (DEMO) { const l = load('wahaj-db-log', {}); l[id] = e; keep('wahaj-db-log', l); return; }
    try { const m = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'); await m.setDoc(m.doc(m.getFirestore(S.fbApp), 'log', id), e); } catch {}
  }

  let tt;
  function toast(t) { const el = $('#ad-toast'); el.textContent = t; el.hidden = false; clearTimeout(tt); tt = setTimeout(() => { el.hidden = true; }, 4200); }

  window.WahajCore = { S, $, esc, load, keep, toast, compress, DEMO, saveData, go: id => go(id), can, logAct, PERMS, ROLE_NAME, token: () => auth.currentUser.getIdToken() };
  startAuth();
})();
