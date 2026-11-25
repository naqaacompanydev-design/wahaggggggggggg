// Wahaj admin: "الإعدادات العامة" (data/settings.json) and "الخدمات والأسعار" (data/pricing.json).
// Every change is kept as an unpublished draft (WahajCore.S.dataPend) until «انشر التعديلات».
(() => {
  const C = () => window.WahajCore;
  const V = (window.WahajViews = window.WahajViews || {});
  const clone = o => JSON.parse(JSON.stringify(o));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const draft = name => { const { S } = C(); return clone(S.dataPend[name] || S.base[name] || {}); };
  function commit(name, obj) {
    const { S, saveData } = C();
    const { _upload, _uploads, ...rest } = obj;
    if (!_upload && same(rest, S.base[name])) delete S.dataPend[name]; else S.dataPend[name] = obj;
    saveData();
  }
  const digits = v => String(v || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, '').replace(/^(00966|966)/, '').replace(/^0/, '');
  const okPhone = v => /^5\d{8}$/.test(digits(v));
  const okMail = v => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(v || '').trim());
  const okUrl = v => !v || /^https:\/\/[^\s"<>]+$/.test(String(v).trim());
  const okHex = v => /^#[0-9a-f]{6}$/i.test(v || '');
  const okNum = v => v !== '' && v != null && Number.isFinite(+v) && +v >= 0;

  // checked before publishing; returns the first problem in plain words
  window.WahajCheck = pend => {
    const s = pend.settings;
    if (s) {
      if (!okPhone(s.phone)) return 'رقم الاتصال لازم يبدأ بـ 05 ويكون 10 أرقام (الإعدادات العامة).';
      if (!okPhone(s.whatsapp)) return 'رقم الواتساب لازم يبدأ بـ 05 ويكون 10 أرقام (الإعدادات العامة).';
      if (!okMail(s.email)) return 'الإيميل غير صحيح (الإعدادات العامة).';
      for (const v of Object.values(s.social || {})) if (!okUrl(v)) return 'رابط سوشيال ميديا لازم يبدأ بـ ⁦https://⁩ (الإعدادات العامة).';
      for (const v of Object.values(s.colors || {})) if (!okHex(v)) return 'لون غير صحيح (الإعدادات العامة).';
    }
    const p = pend.pricing;
    if (p) {
      for (const sv of p.services || []) {
        if (!String(sv.name || '').trim()) return 'فيه خدمة من غير اسم (الخدمات والأسعار).';
        if (sv.min != null && sv.min !== '' && !okNum(sv.min)) return `الحد الأدنى في «${sv.name}» لازم يكون رقم.`;
        for (const it of sv.items || []) {
          if (!String(it.label || '').trim()) return `فيه بند من غير اسم في «${sv.name}».`;
          for (const k of ['price', 'first', 'next', 'rate', 'bundle', 'every']) if (k in it && !okNum(it[k])) return `السعر في «${it.label}» لازم يكون رقم.`;
          for (const o of it.options || []) if (!okNum(o.price) || !String(o.label || '').trim()) return `فيه باقة ناقصة في «${it.label}».`;
        }
        for (const q of sv.questions || []) for (const a of q.add || []) if (!okNum(a)) return `سعر الإضافة في سؤال «${q.q}» لازم يكون رقم.`;
      }
      const h = p.hours || {};
      if (!(+h.todayUntil >= 0 && +h.todayUntil <= 24 && +h.amUntil >= 0 && +h.amUntil <= 24)) return 'مواعيد الحجز غير صحيحة.';
    }
    return null;
  };

  // ---------- الإعدادات العامة ----------
  const SOCIAL = [['snap', 'سناب شات', 'https://www.snapchat.com/add/…'], ['ig', 'إنستغرام', 'https://www.instagram.com/…'], ['tt', 'تيك توك', 'https://www.tiktok.com/@…'], ['x', 'إكس (تويتر)', 'https://x.com/…'], ['yt', 'يوتيوب', 'https://www.youtube.com/@…']];
  const COLORS = [['primary', 'اللون الأساسي', 'الأزرار واللينكات والعناوين الملونة'], ['secondary', 'اللون الثانوي', 'العلامات الخضراء والتدرجات'], ['dark', 'اللون الداكن', 'الخلفيات الداكنة والنصوص الرئيسية']];
  V.settings = root => {
    if (!C().S.base.settings) { root.innerHTML = '<div class="ad-empty"><h3>ما قدرنا نحمّل الإعدادات</h3><p>حدّث الصفحة.</p></div>'; return; }
    const s = draft('settings');
    s.social = s.social || {}; s.colors = s.colors || {};
    const logo = s._upload ? s._upload.data : s.logo;
    root.innerHTML = `
      <div class="ad-form">
        <p class="ad-lead">أي تغيير هنا يتطبق على <b>كل صفحات الموقع</b> مرة واحدة: الأزرار، الفوتر، الحاسبة، ورسائل الواتساب.</p>
        <section class="ad-card"><h3>أرقام التواصل</h3>
          <div class="ad-grid">
            <label class="ad-f"><span>رقم الاتصال</span><input data-f="phone" dir="ltr" inputmode="tel" value="${esc(s.phone)}" placeholder="05XXXXXXXX"><small class="ad-f__err">لازم يبدأ بـ 05 ويكون 10 أرقام</small></label>
            <label class="ad-f"><span>رقم الواتساب</span><input data-f="whatsapp" dir="ltr" inputmode="tel" value="${esc(s.whatsapp)}" placeholder="05XXXXXXXX"><small class="ad-f__err">لازم يبدأ بـ 05 ويكون 10 أرقام</small><small class="ad-f__help">كل أزرار «احجز» و«واتساب» وطلبات الحاسبة بتروح على الرقم ده.</small></label>
            <label class="ad-f"><span>الإيميل</span><input data-f="email" dir="ltr" inputmode="email" value="${esc(s.email)}"><small class="ad-f__err">الإيميل غير صحيح</small></label>
          </div>
        </section>
        <section class="ad-card"><h3>السوشيال ميديا</h3>
          <p class="ad-help">اللي تسيبه فاضي، أيقونته تختفي من الموقع.</p>
          <div class="ad-grid">${SOCIAL.map(([k, t, ph]) => `<label class="ad-f"><span>${t}</span><input data-s="${k}" dir="ltr" inputmode="url" value="${esc(s.social[k] || '')}" placeholder="${ph}"><small class="ad-f__err">الرابط لازم يبدأ بـ ⁦https://⁩</small></label>`).join('')}</div>
        </section>
        <section class="ad-card"><h3>الشعار</h3>
          <div class="ad-logo"><div class="ad-logo__img"><img src="${esc(logo)}" alt="الشعار الحالي"></div>
            <div><button type="button" class="ad-btn ad-btn--ghost" data-a="logo"><svg><use href="#a-img"/></svg>غيّر الشعار</button>
            <p class="ad-help">الأفضل PNG بخلفية شفافة. بيتغير في الهيدر والفوتر وكل مكان فيه الشعار.</p>${s._upload || s.logo !== '/assets/logo.webp' ? '<button type="button" class="ad-link" data-a="logo-reset">رجّع الشعار الأصلي</button>' : ''}</div></div>
          <input type="file" accept="image/*" id="ad-logo-file" hidden>
        </section>
        <section class="ad-card"><h3>الألوان</h3>
          <div class="ad-colors">${COLORS.map(([k, t, d]) => `<label class="ad-color"><input type="color" data-c="${k}" value="${esc(s.colors[k] || '#000000')}"><span><b>${t}</b><small>${d}</small><input class="ad-hex" data-ch="${k}" dir="ltr" value="${esc(s.colors[k] || '')}" maxlength="7"></span></label>`).join('')}</div>
          <div class="ad-cprev" id="ad-cprev"></div>
          <button type="button" class="ad-link" data-a="colors-reset">رجّع الألوان الأصلية</button>
        </section>
        <section class="ad-card"><h3>التقسيط</h3>
          <label class="ad-switch"><input type="checkbox" data-f="installments" ${s.installments !== false ? 'checked' : ''}><i aria-hidden="true"></i><span><b>إظهار تابي وتمارا</b><small>شعارات التقسيط وسطر «أو 4 دفعات» في الصفحات والحاسبة.</small></span></label>
        </section>
      </div>`;
    const read = () => {
      const o = draft('settings'); o.social = o.social || {}; o.colors = o.colors || {};
      root.querySelectorAll('[data-f]').forEach(i => { o[i.dataset.f] = i.type === 'checkbox' ? i.checked : i.value.trim(); });
      root.querySelectorAll('[data-s]').forEach(i => { o.social[i.dataset.s] = i.value.trim(); });
      root.querySelectorAll('[data-c]').forEach(i => { o.colors[i.dataset.c] = i.value.toUpperCase(); });
      return o;
    };
    const check = () => {
      root.querySelectorAll('[data-f="phone"],[data-f="whatsapp"]').forEach(i => i.closest('.ad-f').classList.toggle('is-bad', !okPhone(i.value)));
      root.querySelectorAll('[data-f="email"]').forEach(i => i.closest('.ad-f').classList.toggle('is-bad', !okMail(i.value)));
      root.querySelectorAll('[data-s]').forEach(i => i.closest('.ad-f').classList.toggle('is-bad', !okUrl(i.value)));
    };
    const preview = () => {
      const c = {}; root.querySelectorAll('[data-c]').forEach(i => { c[i.dataset.c] = i.value; });
      root.querySelector('#ad-cprev').innerHTML = `<div class="ad-cprev__bar" style="background:${c.dark}"><span style="background:${c.secondary}"></span><b>وهج</b></div>
        <div class="ad-cprev__body"><b style="color:${c.dark}">عنوان في الموقع <em style="color:${c.primary};font-style:normal">ملوّن</em></b><span class="ad-cprev__btn" style="background:${c.primary}">احسب السعر</span><span class="ad-cprev__tag" style="background:${c.secondary}33;color:${c.dark}">✓ كل أحياء الرياض</span></div>`;
    };
    root.oninput = e => {
      const t = e.target;
      if (t.dataset.ch) { const v = t.value.trim(); if (okHex(v)) root.querySelector(`[data-c="${t.dataset.ch}"]`).value = v; else return; }
      if (t.dataset.c) root.querySelector(`[data-ch="${t.dataset.c}"]`).value = t.value.toUpperCase();
      check(); preview(); commit('settings', read());
    };
    root.onchange = e => { if (e.target.type === 'checkbox') commit('settings', read()); };
    root.onclick = e => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'logo') root.querySelector('#ad-logo-file').click();
      if (a.dataset.a === 'logo-reset') { const o = read(); delete o._upload; o.logo = '/assets/logo.webp'; commit('settings', o); V.settings(root); }
      if (a.dataset.a === 'colors-reset') { const o = read(); o.colors = { primary: '#2C70A8', secondary: '#96CC8A', dark: '#1F2540' }; commit('settings', o); V.settings(root); }
    };
    root.querySelector('#ad-logo-file').addEventListener('change', async e => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      try {
        const r = await C().compress(f, 600);
        const o = read(); const id = `logo-${Date.now().toString(36)}`;
        o._upload = { id, data: r.data }; o.logo = `upload:${id}`;
        commit('settings', o); V.settings(root);
      } catch { C().toast('ما قدرنا نقرا الصورة. جرّب PNG أو JPG.'); }
    });
    check(); preview();
  };

  // ---------- الخدمات والأسعار ----------
  const ICONS = { 's-bed': 'غرفة نوم', 's-sofa': 'كنب', 's-ac': 'مكيف', 's-desk': 'مكتب', 's-bug': 'حشرات', 's-shelf': 'محل', 's-paint': 'دهان', 's-kitchen': 'مطبخ', 's-bath': 'حمام', 's-glass': 'زجاج', 's-floor': 'أرضيات', 's-carpet': 'سجاد', 's-majlis': 'مجلس', 's-curtain': 'ستارة', 's-chair': 'كرسي', 's-fan': 'مروحة', 's-spray': 'رشاش', 's-drop': 'ماء', 's-leaf': 'ورقة شجر', 's-box': 'صندوق', 's-shield': 'حماية', 's-door': 'باب', 's-sign': 'لوحة', 's-wind': 'هواء' };
  const TYPE = { qty: 'بالعدد', tier: 'أول قطعة وبعدها', area: 'بالمتر المربع', bundle: 'عرض كمية', pkg: 'باقات جاهزة' };
  let sel = 0;
  const nid = p => `${p}${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 4)}`;
  const n = (path, v, label, extra = '') => `<label class="ad-f ad-f--num"><span>${label}</span><input type="number" min="0" step="any" inputmode="decimal" data-p="${path}" data-t="num" value="${esc(v ?? '')}" ${extra}></label>`;
  const t = (path, v, label, ph = '') => `<label class="ad-f"><span>${label}</span><input data-p="${path}" value="${esc(v ?? '')}" placeholder="${esc(ph)}"></label>`;

  function itemHtml(it, i, si) {
    const p = `services.${si}.items.${i}`;
    let f = '';
    if (it.type === 'qty') f = t(`${p}.label`, it.label, 'اسم البند') + t(`${p}.unit`, it.unit, 'الوحدة', 'مثال: للغرفة') + n(`${p}.price`, it.price, 'السعر (ريال)');
    if (it.type === 'tier') f = t(`${p}.label`, it.label, 'اسم البند') + n(`${p}.first`, it.first, 'سعر أول قطعة') + n(`${p}.next`, it.next, 'سعر كل قطعة بعدها');
    if (it.type === 'area') f = t(`${p}.label`, it.label, 'اسم البند') + n(`${p}.rate`, it.rate, 'سعر المتر (ريال)');
    if (it.type === 'bundle') f = t(`${p}.label`, it.label, 'اسم البند') + n(`${p}.price`, it.price, 'سعر الواحدة') + n(`${p}.every`, it.every, 'كل كم واحدة', 'step="1" min="1"') + n(`${p}.bundle`, it.bundle, 'بسعر (ريال)') + t(`${p}.unit`, it.unit, 'نص العرض', 'كل 3 مكيفات بـ 99 ريال');
    if (it.type === 'pkg') f = t(`${p}.label`, it.label, 'اسم البند') + ('note' in it ? t(`${p}.note`, it.note, 'ملاحظة تحت البند') : '')
      + `<div class="ad-opts"><b>الباقات</b>${(it.options || []).map((o, oi) => `<div class="ad-opt">${t(`${p}.options.${oi}.label`, o.label, 'اسم الباقة')}${n(`${p}.options.${oi}.price`, o.price, 'السعر')}<button type="button" class="ad-x" data-a="del-opt" data-i="${i}" data-o="${oi}" aria-label="احذف الباقة">×</button></div>`).join('')}
        <button type="button" class="ad-link" data-a="add-opt" data-i="${i}">+ باقة جديدة</button></div>`;
    return `<div class="ad-item"><div class="ad-item__h"><span class="ad-tag ad-tag--b">${TYPE[it.type] || it.type}</span><button type="button" class="ad-x" data-a="del-item" data-i="${i}" aria-label="احذف البند">×</button></div><div class="ad-grid ad-grid--item">${f}</div></div>`;
  }
  function questionHtml(q, qi, si) {
    const p = `services.${si}.questions.${qi}`;
    return `<div class="ad-item"><div class="ad-item__h"><span class="ad-tag">سؤال ${qi + 1}</span><button type="button" class="ad-x" data-a="del-q" data-q="${qi}" aria-label="احذف السؤال">×</button></div>
      <div class="ad-grid ad-grid--item">${t(`${p}.q`, q.q, 'السؤال', 'مثال: فيه مصعد؟')}${t(`${p}.label`, q.label, 'اسمه في الفاتورة (لو له سعر)', 'اختياري')}</div>
      <div class="ad-opts"><b>الإجابات</b>${(q.options || []).map((o, oi) => `<div class="ad-opt">${t(`${p}.options.${oi}`, o, 'الإجابة')}${n(`${p}.add.${oi}`, (q.add || [])[oi] ?? 0, 'يزيد السعر')}<button type="button" class="ad-x" data-a="del-qopt" data-q="${qi}" data-o="${oi}" aria-label="احذف الإجابة">×</button></div>`).join('')}
        <button type="button" class="ad-link" data-a="add-qopt" data-q="${qi}">+ إجابة جديدة</button></div></div>`;
  }

  V.services = root => {
    const W = draft('pricing');
    if (!W.services) { root.innerHTML = '<div class="ad-empty"><h3>ما قدرنا نحمّل الأسعار</h3><p>حدّث الصفحة.</p></div>'; return; }
    if (sel >= W.services.length) sel = 0;
    const s = W.services[sel], si = sel;
    W.hours = W.hours || { todayUntil: 19, amUntil: 11 };
    const hours = (path, v) => `<select data-p="${path}" data-t="num">${Array.from({ length: 25 }, (_, h) => `<option value="${h}" ${+v === h ? 'selected' : ''}>${h === 0 ? '12 بالليل' : h < 12 ? `${h} الصبح` : h === 12 ? '12 الظهر' : `${h - 12} ${h < 18 ? 'العصر' : 'بالليل'}`}</option>`).join('')}</select>`;
    root.innerHTML = `
      <div class="ad-form">
        <p class="ad-lead">الأسعار هنا هي اللي بتطلع للعميل في <b>حاسبة الأسعار</b>. ${W.demo ? '<span class="ad-tag">الأسعار الحالية تجريبية</span>' : ''}</p>
        <div class="ad-tabs" role="tablist">${W.services.map((x, i) => `<button type="button" role="tab" aria-selected="${i === sel}" data-a="sel" data-i="${i}">${esc(x.name)}${x.mode === 'inspect' ? ' <small>معاينة</small>' : ''}</button>`).join('')}<button type="button" class="ad-tabs__add" data-a="add-svc">+ خدمة جديدة</button></div>

        <section class="ad-card"><h3>الخدمة</h3>
          <div class="ad-grid">${t(`services.${si}.name`, s.name, 'اسم الخدمة')}${t(`services.${si}.desc`, s.desc, 'وصف قصير', 'مثال: شقق، فلل، دوبلكس')}${n(`services.${si}.min`, s.min ?? '', 'أقل مبلغ للطلب (ريال)')}
            <label class="ad-f"><span>الأيقونة</span><select data-p="services.${si}.icon">${Object.entries(ICONS).map(([k, v]) => `<option value="${k}" ${s.icon === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
          <label class="ad-switch"><input type="checkbox" data-p="services.${si}.mode" data-t="inspect" ${s.mode === 'inspect' ? 'checked' : ''}><i aria-hidden="true"></i><span><b>السعر بالمعاينة</b><small>بدل الأسعار، العميل يطلب معاينة على الواتساب أو يتصل.</small></span></label>
          <button type="button" class="ad-link ad-link--red" data-a="del-svc">احذف الخدمة دي من الحاسبة</button>
        </section>

        <section class="ad-card"><h3>بنود السعر</h3>
          ${(s.items || []).map((it, i) => itemHtml(it, i, si)).join('') || '<p class="ad-help">مافيش بنود.</p>'}
          <div class="ad-add"><span>بند جديد:</span>${Object.entries(TYPE).map(([k, v]) => `<button type="button" class="ad-btn ad-btn--ghost ad-btn--sm" data-a="add-item" data-type="${k}">+ ${v}</button>`).join('')}</div>
        </section>

        <section class="ad-card"><h3>الأسئلة السريعة</h3>
          <p class="ad-help">أسئلة بتظهر للعميل تحت البنود. لو حطيت سعر لإجابة، بيتضاف على الطلب.</p>
          ${(s.questions || []).map((q, qi) => questionHtml(q, qi, si)).join('')}
          <button type="button" class="ad-btn ad-btn--ghost ad-btn--sm" data-a="add-q">+ سؤال جديد</button>
        </section>

        ${(s.presets || []).length ? `<section class="ad-card"><h3>الاختيارات الجاهزة</h3><p class="ad-help">أزرار سريعة زي «شقة صغيرة» بتملا البنود للعميل.</p>
          ${s.presets.map((pr, pi) => `<div class="ad-opt">${t(`services.${si}.presets.${pi}.label`, pr.label, 'اسم الاختيار')}<button type="button" class="ad-x" data-a="del-preset" data-i="${pi}" aria-label="احذف">×</button></div>`).join('')}</section>` : ''}

        <section class="ad-card"><h3>مواعيد الحجز <small>(لكل الخدمات)</small></h3>
          <div class="ad-grid"><label class="ad-f"><span>آخر وقت لحجز نفس اليوم</span>${hours('hours.todayUntil', W.hours.todayUntil)}</label>
          <label class="ad-f"><span>الفترة الصباحية تقفل الساعة</span>${hours('hours.amUntil', W.hours.amUntil)}</label></div>
        </section>

        <section class="ad-card"><h3>الأحياء <small>(لكل الخدمات)</small></h3>
          <p class="ad-help">الأحياء اللي بتطلع للعميل وهو بيكتب حيّه في الحاسبة. كل حي في سطر.</p>
          <textarea class="ad-ta" rows="8" data-p="districts" data-t="lines">${esc((W.districts || []).join('\n'))}</textarea>
        </section>
      </div>`;

    const save = () => commit('pricing', W);
    const setPath = (path, val) => { const ks = path.split('.'); let o = W; ks.slice(0, -1).forEach((k, i) => { if (o[k] == null) o[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[k]; }); o[ks[ks.length - 1]] = val; };
    const onField = e => {
      const el = e.target, path = el.dataset.p; if (!path) return;
      let v = el.value;
      if (el.dataset.t === 'num') { v = el.value === '' ? '' : +el.value; el.closest('.ad-f')?.classList.toggle('is-bad', !okNum(el.value)); }
      if (el.dataset.t === 'lines') v = el.value.split('\n').map(x => x.trim()).filter(Boolean);
      if (el.dataset.t === 'inspect') { if (el.checked) W.services[si].mode = 'inspect'; else delete W.services[si].mode; return save(); }
      setPath(path, v); save();
      if (path.endsWith('.name')) { const tab = root.querySelector(`.ad-tabs [data-i="${si}"]`); if (tab) tab.firstChild.textContent = v; }
    };
    root.oninput = onField;
    root.onchange = e => { if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox') onField(e); };
    root.onclick = e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a, i = +b.dataset.i, sv = W.services[si];
      if (a === 'sel') { sel = i; return V.services(root); }
      if (a === 'add-svc') { W.services.push({ id: nid('s'), name: 'خدمة جديدة', desc: '', icon: 's-spray', min: 0, items: [{ id: nid('i'), type: 'qty', label: 'بند جديد', unit: '', price: 0 }], presets: [], questions: [] }); sel = W.services.length - 1; }
      if (a === 'del-svc') { if (W.services.length < 2) return C().toast('لازم تفضل خدمة واحدة على الأقل.'); if (!confirm(`تحذف «${sv.name}» من الحاسبة؟`)) return; W.services.splice(si, 1); sel = 0; }
      if (a === 'add-item') { const ty = b.dataset.type, it = { id: nid('i'), type: ty, label: 'بند جديد' };
        if (ty === 'qty') Object.assign(it, { unit: '', price: 0 }); if (ty === 'tier') Object.assign(it, { first: 0, next: 0 }); if (ty === 'area') Object.assign(it, { unit: 'ريال للمتر', rate: 0 });
        if (ty === 'bundle') Object.assign(it, { price: 0, every: 3, bundle: 0, unit: '' }); if (ty === 'pkg') it.options = [{ label: 'باقة 1', price: 0 }];
        (sv.items = sv.items || []).push(it); }
      if (a === 'del-item') { if (!confirm(`تحذف بند «${sv.items[i].label}»؟`)) return; sv.items.splice(i, 1); }
      if (a === 'add-opt') sv.items[i].options.push({ label: 'باقة جديدة', price: 0 });
      if (a === 'del-opt') { if (sv.items[i].options.length < 2) return C().toast('لازم تفضل باقة واحدة على الأقل.'); sv.items[i].options.splice(+b.dataset.o, 1); }
      if (a === 'add-q') (sv.questions = sv.questions || []).push({ id: nid('q'), q: 'سؤال جديد؟', options: ['نعم', 'لا'] });
      if (a === 'del-q') { if (!confirm('تحذف السؤال ده؟')) return; sv.questions.splice(+b.dataset.q, 1); }
      if (a === 'add-qopt') { const q = sv.questions[+b.dataset.q]; q.options.push('إجابة جديدة'); if (q.add) q.add.push(0); }
      if (a === 'del-qopt') { const q = sv.questions[+b.dataset.q], o = +b.dataset.o; if (q.options.length < 3) return C().toast('السؤال لازم يكون له إجابتين على الأقل.'); q.options.splice(o, 1); if (q.add) q.add.splice(o, 1); }
      if (a === 'del-preset') sv.presets.splice(i, 1);
      save(); V.services(root);
    };
  };
})();
