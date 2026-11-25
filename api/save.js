// POST /api/save — publishes the admin's page edits.
// 1) checks the sign-in and the person's role (api/_auth.js): each kind of change needs its permission,
// 2) merges the edits into data/content.json, saves new images to assets/uploads/,
// 3) commits everything to the site's GitHub repository in one commit; Vercel then rebuilds the site.
// Vercel settings needed: FIREBASE_PROJECT_ID, ADMIN_EMAILS, GITHUB_TOKEN, GITHUB_REPO (owner/name), GITHUB_BRANCH.

const env = k => (process.env[k] || '').trim();
const MAX_IMAGE = 3 * 1024 * 1024; // bytes after decoding (images are already resized to WebP in the browser)

const A = require('./_auth');
const gh = A.gh;

// ---------- validation ----------
const KEY = /^[sp]i?\d{1,5}$/;
const PAGE = /^\/[a-z0-9\-/]*$/i;
const clean = (v, max) => String(v).replace(/[\u0000-\u001f]/g, ' ').slice(0, max);

// ---------- data files (settings, prices) ----------
const num = (v, min = 0, max = 1e6) => { const n = Number(v); return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 100) / 100 : null; };
const str = (v, max = 300) => (typeof v === 'string' ? clean(v.trim(), max) : '');
const digits = v => String(v || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, '').replace(/^(00966|966)/, '').replace(/^0/, '');
function checkSettings(s, uploaded) {
  if (!s || typeof s !== 'object') throw new Error('الإعدادات غير صالحة');
  const ph = digits(s.phone), wa = digits(s.whatsapp);
  if (!/^5\d{8}$/.test(ph) || !/^5\d{8}$/.test(wa)) throw new Error('رقم الجوال لازم يبدأ بـ 05 ويكون 10 أرقام');
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(s.email || '')) throw new Error('الإيميل غير صحيح');
  const social = {};
  for (const k of ['snap', 'ig', 'tt', 'x', 'yt']) { const u = str((s.social || {})[k], 300); if (u && !/^https:\/\/[^\s"<>]+$/.test(u)) throw new Error('رابط سوشيال ميديا غير صحيح'); social[k] = u; }
  const colors = {};
  for (const k of ['primary', 'secondary', 'dark']) { const c = String((s.colors || {})[k] || ''); if (!/^#[0-9a-f]{6}$/i.test(c)) throw new Error('لون غير صحيح'); colors[k] = c.toUpperCase(); }
  let logo = String(s.logo || '/assets/logo.webp');
  const up = /^upload:(.+)$/.exec(logo);
  if (up) logo = uploaded.get(up[1]) || '/assets/logo.webp';
  if (!/^\/assets\/[\w\-/.]+$/.test(logo)) logo = '/assets/logo.webp';
  return { _note: 'الإعدادات العامة للموقع، تتعدل من لوحة التحكم. وقت البناء تتطبق على كل صفحات الموقع.', phone: '0' + ph, whatsapp: '0' + wa, email: String(s.email).trim(), social, colors, logo, installments: s.installments !== false };
}
function checkPricing(p) {
  if (!p || typeof p !== 'object' || !Array.isArray(p.services) || !p.services.length) throw new Error('بيانات الأسعار غير صالحة');
  for (const s of p.services) {
    if (!/^[a-z0-9-]{2,30}$/.test(s.id || '') || !str(s.name) || !Array.isArray(s.items)) throw new Error('خدمة ناقصة البيانات');
    if (s.min != null && num(s.min) == null) throw new Error(`الحد الأدنى غير صحيح في «${s.name}»`);
    for (const it of s.items) {
      if (!str(it.label)) throw new Error(`بند بدون اسم في «${s.name}»`);
      for (const k of ['price', 'first', 'next', 'rate', 'bundle', 'every']) if (it[k] != null && num(it[k]) == null) throw new Error(`سعر غير صحيح في «${it.label}»`);
      for (const o of it.options || []) if (num(o.price) == null || !str(o.label)) throw new Error(`باقة غير صحيحة في «${it.label}»`);
    }
    for (const q of s.questions || []) for (const a of q.add || []) if (num(a) == null) throw new Error('سعر إضافة غير صحيح في الأسئلة');
  }
  if (p.hours && (num(p.hours.todayUntil, 0, 24) == null || num(p.hours.amUntil, 0, 24) == null)) throw new Error('مواعيد الحجز غير صحيحة');
  const out = JSON.stringify(p, null, 1);
  if (out.length > 400000) throw new Error('ملف الأسعار كبير جدًا');
  return p;
}

// lists edited in the admin: file name -> the array inside it
const LISTS = { offers: 'offers', reviews: 'reviews', partners: 'partners', portfolio: 'items', posts: 'posts', faq: 'groups', gift: 'occasions' };
const LIST_NAME = { offers: 'العروض', reviews: 'آراء العملاء', partners: 'شركاء النجاح', portfolio: 'معرض الأعمال', posts: 'المدونة', faq: 'الأسئلة الشائعة', gift: 'مناسبات الإهداء' };
function checkList(name, d, uploaded) {
  if (!d || typeof d !== 'object' || !Array.isArray(d[LISTS[name]])) throw new Error(`بيانات «${LIST_NAME[name]}» غير صالحة`);
  // every text is cleaned (no HTML), and "upload:<id>" becomes the saved image's path
  const walk = v => {
    if (typeof v === 'string') {
      const up = /^upload:(.+)$/.exec(v);
      if (up) return uploaded.get(up[1]) || '';
      return v.replace(/[<>]/g, '').replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ').slice(0, 20000);
    }
    if (Array.isArray(v)) return v.slice(0, 500).map(walk);
    if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) if (!k.startsWith('_') || k === '_note') o[k] = walk(x); return o; }
    return typeof v === 'number' || typeof v === 'boolean' || v === null ? v : null;
  };
  const out = walk(d);
  if (name === 'posts') {
    const seen = new Set();
    for (const p of out.posts) {
      if (!/^[a-z0-9-]{2,80}$/.test(p.slug || '')) throw new Error(`رابط المقال «${p.title || ''}» لازم يكون حروف إنجليزي صغيرة وأرقام وشرطة`);
      if (seen.has(p.slug)) throw new Error(`فيه مقالين بنفس الرابط: ${p.slug}`);
      seen.add(p.slug);
    }
  }
  if (JSON.stringify(out).length > 600000) throw new Error(`«${LIST_NAME[name]}» كبير جدًا`);
  return out;
}

module.exports = async (req, res) => {
  const send = (code, obj) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)); };
  if (req.method !== 'POST') return send(405, { error: 'POST فقط' });
  for (const k of ['GITHUB_TOKEN', 'GITHUB_REPO']) if (!env(k)) return send(500, { error: `إعداد ناقص في Vercel: ${k}` });

  const me = await A.who(req, res); if (!me) return;
  const email = me.email;

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object') return send(400, { error: 'طلب غير صالح' });
  body.edits = Array.isArray(body.edits) ? body.edits : [];
  const data = body.data && typeof body.data === 'object' ? body.data : {};
  if ((!body.edits.length && !Object.keys(data).length) || body.edits.length > 500) return send(400, { error: 'مافيش تعديلات صالحة' });
  const need = [...(body.edits.length ? ['content'] : []), ...(data.settings ? ['settings'] : []), ...(data.pricing ? ['pricing'] : []), ...(Object.keys(LISTS).some(k => data[k]) ? ['lists'] : [])];
  const missing = need.filter(p => !me.can(p));
  if (missing.length) return send(403, { error: `صلاحيتك (${A.ROLE_NAME[me.role]}) ما تسمح بنشر ${missing.map(p => ({ content: 'نصوص وصور الصفحات', settings: 'الإعدادات العامة', pricing: 'الخدمات والأسعار', lists: 'الأقسام' })[p]).join(' و')}` });

  const branch = env('GITHUB_BRANCH') || 'main';
  try {
    // new images
    const files = [];
    const uploaded = new Map();
    for (const im of Array.isArray(body.images) ? body.images.slice(0, 30) : []) {
      if (!/^[a-z0-9-]{4,40}$/.test(im.id || '')) continue;
      const ext = im.type === 'image/webp' ? 'webp' : im.type === 'image/jpeg' ? 'jpg' : null;
      const buf = Buffer.from(String(im.data || ''), 'base64');
      if (!ext || !buf.length || buf.length > MAX_IMAGE) return send(400, { error: 'صورة غير صالحة أو كبيرة جدًا' });
      const path = `assets/uploads/${im.id}.${ext}`;
      files.push({ path, content: buf.toString('base64'), encoding: 'base64' });
      uploaded.set(im.id, '/' + path);
    }

    // current content.json from the repository
    const ref = await gh(`/git/ref/heads/${encodeURIComponent(branch)}`);
    const head = await gh(`/git/commits/${ref.object.sha}`);
    let content = { v: 1, shell: { ar: {}, en: {} }, pages: {} };
    try {
      const cur = await gh(`/contents/data/content.json?ref=${encodeURIComponent(branch)}`);
      content = JSON.parse(Buffer.from(cur.content, 'base64').toString('utf8'));
    } catch {}
    content.shell = content.shell || {}; content.pages = content.pages || {};

    let n = 0;
    for (const e of body.edits) {
      if (!e || !KEY.test(e.key || '') || typeof e.o !== 'string' || e.o.length > 12) continue;
      const bucket = e.scope === 'shell'
        ? (content.shell[e.lang === 'en' ? 'en' : 'ar'] ||= {})
        : (PAGE.test(e.page || '') ? (content.pages[e.page] ||= {}) : null);
      if (!bucket) continue;
      const v = { ...(bucket[e.key] || {}), o: e.o };
      if (typeof e.t === 'string' && e.t.trim()) v.t = clean(e.t.trim(), 2000);
      if (typeof e.src === 'string') {
        const up = /^upload:(.+)$/.exec(e.src);
        if (up && uploaded.has(up[1])) v.src = uploaded.get(up[1]);
        else if (/^\/assets\/[\w\-/.]+$/.test(e.src)) v.src = e.src;
      }
      if (typeof e.alt === 'string') v.alt = clean(e.alt.trim(), 300);
      bucket[e.key] = v; n++;
    }
    const json = o => Buffer.from(JSON.stringify(o, null, 1) + '\n').toString('base64');
    if (n) { content.updated = new Date().toISOString(); files.push({ path: 'data/content.json', content: json(content), encoding: 'base64' }); }
    const what = [];
    if (n) what.push(`${n} تعديل`);
    try {
      if (data.settings) { files.push({ path: 'data/settings.json', content: json(checkSettings(data.settings, uploaded)), encoding: 'base64' }); what.push('الإعدادات العامة'); }
      if (data.pricing) { files.push({ path: 'data/pricing.json', content: json(checkPricing(data.pricing)), encoding: 'base64' }); what.push('الخدمات والأسعار'); }
      for (const name of Object.keys(LISTS)) if (data[name]) { files.push({ path: `data/${name}.json`, content: json(checkList(name, data[name], uploaded)), encoding: 'base64' }); what.push(LIST_NAME[name]); }
    } catch (err) { return send(400, { error: err.message }); }
    if (!what.length) return send(400, { error: 'مافيش تعديلات صالحة' });

    // one commit with everything
    const tree = [];
    for (const f of files) {
      const blob = await gh('/git/blobs', { method: 'POST', body: { content: f.content, encoding: f.encoding } });
      tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const t = await gh('/git/trees', { method: 'POST', body: { base_tree: head.tree.sha, tree } });
    const c = await gh('/git/commits', { method: 'POST', body: { message: `لوحة التحكم: ${what.join('، ')} — ${email}`, tree: t.sha, parents: [head.sha] } });
    await gh(`/git/refs/heads/${encodeURIComponent(branch)}`, { method: 'PATCH', body: { sha: c.sha } });
    await A.log(email, `نشر: ${what.join('، ')}`, c.sha.slice(0, 7));
    return send(200, { ok: true, edits: n, images: uploaded.size, commit: c.sha.slice(0, 7) });
  } catch (e) {
    return send(502, { error: String(e.message || '').startsWith('github 409') ? 'فيه حفظ تاني حصل في نفس الوقت، جرّب تاني' : 'ما قدرنا نحفظ في الموقع، جرّب بعد شوية' });
  }
};
