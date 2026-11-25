// Wahaj admin: list screens — offers, reviews, partners, portfolio, blog, FAQ, gift occasions.
// One editor drives them all from the field lists below. Changes are drafts until «انشر التعديلات».
(() => {
  const C = () => window.WahajCore;
  const V = (window.WahajViews = window.WahajViews || {});
  const clone = o => JSON.parse(JSON.stringify(o));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const today = () => new Date().toISOString().slice(0, 10);
  const nid = p => `${p}${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 4)}`;
  const svc = () => ((C().S.base.pricing || {}).services || []).map(s => [s.id, s.name]);
  const okSlug = v => /^[a-z0-9-]{2,80}$/.test(v || '');
  const okUrl = v => !v || v === '#' || /^https:\/\/[^\s"<>]+$/.test(String(v).trim()); // "#" = not set yet

  // ---------- what each list holds ----------
  const L = {
    offers: { list: 'offers', one: 'عرض', intro: 'العروض بتظهر في الصفحة الرئيسية وصفحة العروض بنفس الترتيب هنا. العرض اللي له تاريخ انتهاء بيختفي لوحده بعد اليوم ده.',
      add: () => ({ s: (svc()[0] || [''])[0], img: '', title: 'عرض جديد', price: 0, oldPrice: null, items: [], until: '', hidden: false }),
      head: o => o.title, sub: o => `${o.price} ريال${o.oldPrice ? ` بدل ${o.oldPrice}` : ''}`, img: o => o.img,
      tag: o => o.hidden ? 'مخفي' : o.until && o.until < today() ? 'انتهى' : '',
      fields: [['img', 'image', 'صورة العرض'], ['title', 'text', 'عنوان العرض'], ['price', 'num', 'السعر (ريال)'], ['oldPrice', 'num', 'السعر قبل الخصم (اختياري)'],
        ['s', 'select', 'الخدمة (لزر «احسب السعر» والتصنيف)', svc], ['items', 'lines', 'اللي يشمله العرض (كل ميزة في سطر)'], ['until', 'date', 'آخر يوم للعرض (اختياري)'], ['hidden', 'check', 'إخفاء العرض من الموقع']] },
    reviews: { list: 'reviews', one: 'رأي', intro: 'آراء العملاء في الرئيسية وصفحة الآراء. ضيف آراء عملاء حقيقيين فقط، والآراء التجريبية عليها علامة «مثال» في الموقع.',
      root: [['googleUrl', 'url', 'لينك «قيّمنا على جوجل» (من خرائط جوجل)']],
      add: () => ({ name: '', area: '', service: (svc()[0] || [''])[0], rating: 5, date: today(), text: '', sample: false }),
      head: r => r.name || 'بدون اسم', sub: r => `${'★'.repeat(+r.rating || 0)} · ${r.area || ''}`, tag: r => r.sample ? 'مثال' : '',
      fields: [['name', 'text', 'اسم العميل'], ['area', 'text', 'الحي', 'مثال: حي النرجس'], ['service', 'select', 'الخدمة', svc], ['rating', 'stars', 'التقييم'], ['date', 'date', 'التاريخ'], ['text', 'textarea', 'الرأي'], ['sample', 'check', 'رأي تجريبي (يظهر عليه «مثال»)']] },
    partners: { list: 'partners', one: 'شريك', intro: 'الشركاء بيظهروا في الشريط المتحرك في الرئيسية وصفحة شركاء النجاح. الأفضل شعار PNG بخلفية شفافة.',
      add: () => ({ name: '', logo: '', sector: '', url: '' }),
      head: p => p.name || 'بدون اسم', sub: p => p.sector || '', img: p => p.logo, contain: true,
      fields: [['logo', 'image', 'الشعار'], ['name', 'text', 'اسم الشريك'], ['sector', 'text', 'المجال', 'مثال: مقاولات وبناء'], ['url', 'url', 'موقعه (اختياري)']] },
    portfolio: { list: 'items', one: 'عمل', intro: 'صور قبل وبعد في صفحة معرض الأعمال.',
      root: [['tiktok', 'url', 'حساب تيك توك (زر «شوف فيديوهاتنا»)']],
      add: () => ({ service: 'homes', title: '', before: '', after: '', sample: false }),
      head: p => p.title || 'بدون عنوان', sub: (p, W) => (W.services || {})[p.service] || '', img: p => p.after, tag: p => p.sample ? 'مثال' : '',
      fields: [['before', 'image', 'صورة قبل'], ['after', 'image', 'صورة بعد'], ['title', 'text', 'العنوان'], ['service', 'select', 'الخدمة', W => Object.entries(W.services || {})], ['sample', 'check', 'صور تجريبية (تظهر عليها «مثال»)']] },
    posts: { list: 'posts', one: 'مقال', intro: 'كل مقال بيتعمل له صفحة لوحده في المدونة. في النص: السطر اللي يبدأ بـ «## » يبقى عنوان، و«- » يبقى نقطة في قائمة.',
      add: () => ({ slug: `post-${today()}`, title: 'مقال جديد', excerpt: '', category: 'tips', date: today(), image: '', minutes: 3, body: '', draft: true }),
      head: p => p.title, sub: p => `${p.date || ''} · /blog/${p.slug || ''}/`, img: p => p.image, tag: p => p.draft ? 'مسودة' : p.date > today() ? 'مجدول' : '',
      fields: [['image', 'image', 'صورة المقال'], ['title', 'text', 'العنوان'], ['slug', 'slug', 'رابط المقال (إنجليزي)'], ['excerpt', 'textarea', 'ملخص قصير (بيظهر في المدونة وجوجل)'],
        ['category', 'select', 'التصنيف', W => Object.entries(W.categories || {})], ['date', 'date', 'تاريخ النشر'], ['minutes', 'num', 'دقائق القراءة'], ['body', 'longtext', 'نص المقال'], ['draft', 'check', 'مسودة (مش منشور)']] },
    faq: { list: 'groups', one: 'مجموعة', intro: 'الأسئلة العامة في صفحة الأسئلة الشائعة. أسئلة كل خدمة بتتعدل من «الصفحات» في صفحة الخدمة نفسها.',
      add: () => ({ id: nid('g'), name: 'مجموعة جديدة', icon: 's-search', qa: [{ q: '', a: '' }] }),
      head: g => g.name, sub: g => `${(g.qa || []).length} سؤال`,
      fields: [['name', 'text', 'اسم المجموعة'], ['qa', 'pairs', 'الأسئلة']] },
    gift: { list: 'occasions', one: 'مناسبة', intro: 'مناسبات الإهداء في الحاسبة وصفحة «أهدِ نظافة» وكارت الإهداء.',
      add: () => ({ id: nid('o'), label: 'مناسبة جديدة', emoji: '🎁', title: '', line: '', ready: [] }),
      head: o => `${o.emoji || ''} ${o.label}`, sub: o => o.title || '',
      fields: [['emoji', 'text', 'الإيموجي'], ['label', 'text', 'اسم المناسبة'], ['title', 'text', 'عنوان الكارت'], ['line', 'text', 'جملة قصيرة'], ['ready', 'lines', 'رسائل جاهزة (كل رسالة في سطر)']] }
  };

  // checked before publishing
  const prevCheck = window.WahajCheck;
  window.WahajCheck = pend => {
    const p = prevCheck && prevCheck(pend); if (p) return p;
    for (const [name, d] of Object.entries(pend)) {
      const def = L[name]; if (!def) continue;
      for (const [k, t, label] of def.root || []) if (t === 'url' && !okUrl(d[k])) return `${label}: الرابط لازم يبدأ بـ ⁦https://⁩`;
      const slugs = new Set();
      for (const it of d[def.list] || []) {
        if (name === 'offers' && (!String(it.title || '').trim() || !(+it.price >= 0) || it.price === '')) return 'فيه عرض من غير عنوان أو سعر.';
        if (name === 'reviews' && (!String(it.name || '').trim() || !String(it.text || '').trim())) return 'فيه رأي من غير اسم أو نص.';
        if (name === 'partners' && !String(it.name || '').trim()) return 'فيه شريك من غير اسم.';
        if (name === 'partners' && !okUrl(it.url)) return `رابط «${it.name}» لازم يبدأ بـ ⁦https://⁩`;
        if (name === 'posts') { if (!okSlug(it.slug)) return `رابط مقال «${it.title}» لازم يكون حروف إنجليزي صغيرة وأرقام وشرطة.`; if (slugs.has(it.slug)) return `فيه مقالين بنفس الرابط: ${it.slug}`; slugs.add(it.slug); }
        if (name === 'faq' && (it.qa || []).some(x => !String(x.q || '').trim() || !String(x.a || '').trim())) return `فيه سؤال من غير إجابة في «${it.name}».`;
      }
    }
    return null;
  };

  // ---------- editor ----------
  const open = {};
  const draft = name => { const { S } = C(); return clone(S.dataPend[name] || S.base[name] || {}); };
  function commit(name, W) {
    const { S, saveData } = C();
    const { _uploads, ...rest } = W;
    if (_uploads) for (const id of Object.keys(_uploads)) if (!JSON.stringify(rest).includes(`upload:${id}`)) delete _uploads[id];
    if (same(rest, S.base[name])) delete S.dataPend[name]; else S.dataPend[name] = W;
    saveData();
  }
  const imgSrc = (v, W) => (String(v || '').startsWith('upload:') ? (W._uploads || {})[v.slice(7)] || '' : v || '');

  function field(W, def, i, [k, type, label, extra]) {
    const it = i == null ? W : W[def.list][i], v = it[k];
    const at = `data-k="${k}"${i == null ? ' data-root' : ` data-i="${i}"`}`;
    const wide = ['textarea', 'longtext', 'lines', 'pairs', 'image'].includes(type) ? ' ad-f--wide' : '';
    if (type === 'text') return `<label class="ad-f${wide}"><span>${label}</span><input ${at} value="${esc(v)}" placeholder="${esc(extra || '')}"></label>`;
    if (type === 'url') return `<label class="ad-f${wide}"><span>${label}</span><input ${at} dir="ltr" inputmode="url" value="${esc(v)}" placeholder="https://"><small class="ad-f__err">الرابط لازم يبدأ بـ ⁦https://⁩</small></label>`;
    if (type === 'slug') return `<label class="ad-f${wide}"><span>${label}</span><input ${at} dir="ltr" value="${esc(v)}" placeholder="clean-sofa-tips"><small class="ad-f__help" dir="ltr">wahjclean.sa/blog/${esc(v)}/</small><small class="ad-f__err">حروف إنجليزي صغيرة وأرقام وشرطة فقط</small></label>`;
    if (type === 'num') return `<label class="ad-f ad-f--num"><span>${label}</span><input ${at} data-t="num" type="number" min="0" step="any" inputmode="decimal" value="${esc(v ?? '')}"></label>`;
    if (type === 'date') return `<label class="ad-f"><span>${label}</span><input ${at} type="date" value="${esc(v)}"></label>`;
    if (type === 'textarea') return `<label class="ad-f${wide}"><span>${label}</span><textarea class="ad-ta" rows="3" ${at}>${esc(v)}</textarea></label>`;
    if (type === 'longtext') return `<label class="ad-f${wide}"><span>${label}</span><textarea class="ad-ta ad-ta--long" rows="14" ${at}>${esc(v)}</textarea><small class="ad-f__help">«## » أول السطر = عنوان · «- » أول السطر = نقطة في قائمة · سطر فاضي بين الفقرات</small></label>`;
    if (type === 'lines') return `<label class="ad-f${wide}"><span>${label}</span><textarea class="ad-ta" rows="4" ${at} data-t="lines">${esc((v || []).join('\n'))}</textarea></label>`;
    if (type === 'check') return `<label class="ad-switch"><input type="checkbox" ${at} data-t="check" ${v ? 'checked' : ''}><i aria-hidden="true"></i><span><b>${label}</b></span></label>`;
    if (type === 'select') { const opts = extra(W); if (v && !opts.some(([o]) => o === v)) opts.push([v, v]); return `<label class="ad-f"><span>${label}</span><select ${at}>${opts.map(([o, t]) => `<option value="${esc(o)}" ${o === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`; }
    if (type === 'stars') return `<div class="ad-f"><span>${label}</span><div class="ad-stars" role="radiogroup" aria-label="${label}">${[1, 2, 3, 4, 5].map(n => `<button type="button" role="radio" aria-checked="${+v === n}" data-a="star" data-i="${i}" data-n="${n}" class="${n <= +v ? 'on' : ''}" aria-label="${n} من 5">★</button>`).join('')}</div></div>`;
    if (type === 'image') { const src = imgSrc(v, W); return `<div class="ad-f${wide}"><span>${label}</span><div class="ad-imgf"><div class="ad-imgf__p${def.contain ? ' is-contain' : ''}">${src ? `<img src="${esc(src)}" alt="">` : '<em>مافيش صورة</em>'}</div><button type="button" class="ad-btn ad-btn--ghost ad-btn--sm" data-a="img" data-i="${i}" data-k="${k}"><svg><use href="#a-img"/></svg>${src ? 'غيّر الصورة' : 'اختر صورة'}</button></div></div>`; }
    if (type === 'pairs') return `<div class="ad-f${wide}"><span>${label}</span>${(v || []).map((x, j) => `<div class="ad-pair"><div class="ad-pair__f"><input data-pq="${j}" data-i="${i}" value="${esc(x.q)}" placeholder="السؤال"><textarea class="ad-ta" rows="2" data-pa="${j}" data-i="${i}" placeholder="الإجابة">${esc(x.a)}</textarea></div><button type="button" class="ad-x" data-a="del-pair" data-i="${i}" data-j="${j}" aria-label="احذف السؤال">×</button></div>`).join('')}<button type="button" class="ad-link" data-a="add-pair" data-i="${i}">+ سؤال جديد</button></div>`;
    return '';
  }

  function view(name, root) {
    const def = L[name], W = draft(name);
    if (!W[def.list]) { root.innerHTML = '<div class="ad-empty"><h3>ما قدرنا نحمّل البيانات</h3><p>حدّث الصفحة.</p></div>'; return; }
    const list = W[def.list];
    root.innerHTML = `
      <div class="ad-form">
        <p class="ad-lead">${def.intro}</p>
        ${def.root ? `<section class="ad-card"><div class="ad-grid">${def.root.map(f => field(W, def, null, f)).join('')}</div></section>` : ''}
        <section class="ad-card"><div class="ad-list__h"><h3>${list.length} ${def.one}</h3><button type="button" class="ad-btn ad-btn--primary ad-btn--sm" data-a="add">+ إضافة ${def.one}</button></div>
          <ul class="ad-list">${list.map((it, i) => {
            const img = def.img && imgSrc(def.img(it), W), tag = def.tag ? def.tag(it) : '';
            return `<li class="ad-li${open[name] === i ? ' is-open' : ''}">
              <div class="ad-li__row">
                ${def.img ? `<span class="ad-li__img${def.contain ? ' is-contain' : ''}">${img ? `<img src="${esc(img)}" alt="">` : ''}</span>` : ''}
                <button type="button" class="ad-li__t" data-a="toggle" data-i="${i}" aria-expanded="${open[name] === i}"><b>${esc(def.head(it, W))}</b><small>${esc(def.sub(it, W))}</small></button>
                ${tag ? `<span class="ad-tag">${tag}</span>` : ''}
                <span class="ad-li__act"><button type="button" class="ad-iconbtn" data-a="up" data-i="${i}" aria-label="لفوق" ${i ? '' : 'disabled'}>↑</button><button type="button" class="ad-iconbtn" data-a="down" data-i="${i}" aria-label="لتحت" ${i < list.length - 1 ? '' : 'disabled'}>↓</button><button type="button" class="ad-x" data-a="del" data-i="${i}" aria-label="احذف">×</button></span>
              </div>
              ${open[name] === i ? `<div class="ad-li__ed"><div class="ad-grid">${def.fields.map(f => field(W, def, i, f)).join('')}</div><button type="button" class="ad-btn ad-btn--ghost ad-btn--sm" data-a="toggle" data-i="${i}">تمام، اقفل</button></div>` : ''}
            </li>`; }).join('') || `<li class="ad-help">مافيش ${def.one} لسه.</li>`}</ul>
        </section>
        <input type="file" accept="image/*" id="ad-list-file" hidden>
      </div>`;

    const item = el => (el.hasAttribute('data-root') ? W : list[+el.dataset.i]);
    root.oninput = e => {
      const el = e.target;
      if (el.dataset.pq != null || el.dataset.pa != null) {
        const g = list[+el.dataset.i], j = +(el.dataset.pq ?? el.dataset.pa);
        g.qa[j][el.dataset.pq != null ? 'q' : 'a'] = el.value; return commit(name, W);
      }
      const k = el.dataset.k; if (!k || el.dataset.a) return;
      let v = el.value;
      if (el.dataset.t === 'num') v = el.value === '' ? (k === 'oldPrice' ? null : '') : +el.value;
      if (el.dataset.t === 'lines') v = el.value.split('\n').map(x => x.trim()).filter(Boolean);
      if (el.dataset.t === 'check') v = el.checked;
      if (el.type === 'url' || el.inputMode === 'url') el.closest('.ad-f').classList.toggle('is-bad', !okUrl(v));
      if (k === 'slug') { v = v.trim().toLowerCase(); el.closest('.ad-f').classList.toggle('is-bad', !okSlug(v)); const h = el.closest('.ad-f').querySelector('.ad-f__help'); if (h) h.textContent = `wahjclean.sa/blog/${v}/`; }
      item(el)[k] = v; commit(name, W);
      if (!el.hasAttribute('data-root')) { const li = el.closest('.ad-li'); const i = +el.dataset.i; li.querySelector('.ad-li__t b').textContent = def.head(list[i], W); li.querySelector('.ad-li__t small').textContent = def.sub(list[i], W); }
    };
    root.onchange = e => { if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox' || e.target.type === 'date') { root.oninput(e); if (e.target.type === 'checkbox' || e.target.type === 'date') view(name, root); } };
    let pickFor = null;
    root.onclick = e => {
      const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
      const a = b.dataset.a, i = +b.dataset.i;
      if (a === 'toggle') { open[name] = open[name] === i ? null : i; return view(name, root); }
      if (a === 'add') { list.push(def.add()); open[name] = list.length - 1; }
      if (a === 'del') { if (!confirm(`تحذف «${def.head(list[i], W)}»؟`)) return; list.splice(i, 1); open[name] = null; }
      if (a === 'up' || a === 'down') { const j = a === 'up' ? i - 1 : i + 1; [list[i], list[j]] = [list[j], list[i]]; if (open[name] === i) open[name] = j; }
      if (a === 'star') list[i].rating = +b.dataset.n;
      if (a === 'add-pair') (list[i].qa = list[i].qa || []).push({ q: '', a: '' });
      if (a === 'del-pair') list[i].qa.splice(+b.dataset.j, 1);
      if (a === 'img') { pickFor = { i, k: b.dataset.k }; return root.querySelector('#ad-list-file').click(); }
      commit(name, W); view(name, root);
    };
    root.querySelector('#ad-list-file').onchange = async e => {
      const f = e.target.files[0]; e.target.value = ''; if (!f || !pickFor) return;
      try {
        const r = await C().compress(f, name === 'partners' ? 600 : 1600);
        const id = nid('img-'); W._uploads = W._uploads || {}; W._uploads[id] = r.data;
        list[pickFor.i][pickFor.k] = `upload:${id}`;
        commit(name, W); view(name, root);
      } catch { C().toast('ما قدرنا نقرا الصورة. جرّب JPG أو PNG.'); }
    };
  }
  for (const name of Object.keys(L)) V[name] = root => view(name, root);
})();
