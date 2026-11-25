// /api/users — admin accounts (admins only).
// GET  → the list.   POST { action: 'create' | 'update' | 'delete', email, name?, role?, active? }
// A new user gets a sign-in account in Firebase with a one-time password shown to the admin;
// they can change it from «نسيت كلمة المرور». The owners in ADMIN_EMAILS can't be changed from here.
const crypto = require('crypto');
const F = require('./_fs');
const A = require('./_auth');

const idt = p => `https://identitytoolkit.googleapis.com/v1/projects/${F.env('FIREBASE_PROJECT_ID')}/${p}`;
async function auth(p, body) {
  const r = await fetch(idt(p), { method: 'POST', headers: { Authorization: `Bearer ${await F.token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((j.error && j.error.message) || `auth ${r.status}`); e.code = j.error && j.error.message; throw e; }
  return j;
}
const localId = async email => ((await auth('accounts:lookup', { email: [email] })).users || [])[0]?.localId || null;
const password = () => crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 10) + '#7';

module.exports = async (req, res) => {
  const me = await A.who(req, res, 'users'); if (!me) return;
  if (!F.ready()) return F.send(res, 500, { error: 'إعداد ناقص في Vercel: FIREBASE_CLIENT_EMAIL و FIREBASE_PRIVATE_KEY' });
  try {
    if (req.method === 'GET') {
      const list = (await F.list('users')).map(u => ({ email: u.id, ...u.data }));
      return F.send(res, 200, { ok: true, owners: A.owners(), users: list });
    }
    if (req.method !== 'POST') return F.send(res, 405, { error: 'غير مسموح' });
    const b = F.body(req);
    const email = String(b.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return F.send(res, 400, { error: 'الإيميل غير صحيح' });
    if (A.owners().includes(email)) return F.send(res, 400, { error: 'الحساب ده من الملاك، يتغير من إعدادات Vercel بس' });
    if (email === me.email) return F.send(res, 400, { error: 'ما تقدر تغيّر حسابك أنت' });
    const role = b.role && A.PERMS[b.role] ? b.role : null;

    if (b.action === 'create') {
      if (!role) return F.send(res, 400, { error: 'اختر الصلاحية' });
      let pass = null;
      try { pass = password(); await auth('accounts', { email, password: pass, displayName: F.txt(b.name, 80) }); }
      catch (e) { if (e.code !== 'EMAIL_EXISTS') throw e; pass = null; } // already has an account: only the role is added
      await F.commit([{ path: `users/${email}`, data: { name: F.txt(b.name, 80), role, active: true, createdAt: new Date().toISOString(), by: me.email } }]);
      await A.log(me.email, `أضاف مستخدم: ${email} (${A.ROLE_NAME[role]})`);
      return F.send(res, 200, { ok: true, password: pass });
    }
    const cur = await F.get(`users/${email}`);
    if (!cur) return F.send(res, 404, { error: 'المستخدم غير موجود' });
    if (b.action === 'update') {
      const next = { ...cur.data, ...(role ? { role } : {}), ...(typeof b.active === 'boolean' ? { active: b.active } : {}), ...(b.name != null ? { name: F.txt(b.name, 80) } : {}) };
      await F.commit([{ path: `users/${email}`, data: next }]);
      if (typeof b.active === 'boolean') { const id = await localId(email); if (id) await auth('accounts:update', { localId: id, disableUser: !b.active }); }
      await A.log(me.email, `عدّل مستخدم: ${email}`, `${A.ROLE_NAME[next.role]}${next.active === false ? ' · موقوف' : ''}`);
      return F.send(res, 200, { ok: true });
    }
    if (b.action === 'delete') {
      const id = await localId(email); if (id) await auth('accounts:delete', { localId: id });
      await F.remove(`users/${email}`);
      await A.log(me.email, `حذف مستخدم: ${email}`);
      return F.send(res, 200, { ok: true });
    }
    return F.send(res, 400, { error: 'عملية غير معروفة' });
  } catch (e) { return F.send(res, 502, { error: 'ما قدرنا نكمل العملية، جرّب بعد شوية' }); }
};
