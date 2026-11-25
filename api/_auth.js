// Shared: who is signed in, what they may do, GitHub access and the activity log.
// Roles:  admin  = everything (the owners in ADMIN_EMAILS are always admin)
//         editor = page text and images, and the lists (offers, reviews, blog…)
//         sales  = coupons, gift cards, quotes, orders
// Other users live in Firestore users/{email}: { name, role, active }.
const crypto = require('crypto');
const F = require('./_fs');
const env = F.env;

const PERMS = {
  admin: ['content', 'lists', 'settings', 'pricing', 'sales', 'users', 'log'],
  editor: ['content', 'lists'],
  sales: ['sales']
};
const ROLE_NAME = { admin: 'مدير', editor: 'محرر محتوى', sales: 'مبيعات' };

// ---------- Firebase sign-in token (checked against Google's public keys, no extra packages) ----------
let certs = null, certsUntil = 0;
async function googleCerts() {
  if (certs && Date.now() < certsUntil) return certs;
  const r = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
  certs = await r.json();
  const m = /max-age=(\d+)/.exec(r.headers.get('cache-control') || '');
  certsUntil = Date.now() + (m ? +m[1] * 1000 : 3600e3);
  return certs;
}
async function verifyToken(token) {
  const project = env('FIREBASE_PROJECT_ID');
  const [h, p, s] = String(token || '').split('.');
  if (!h || !p || !s) throw new Error('auth');
  const head = JSON.parse(Buffer.from(h, 'base64url'));
  const body = JSON.parse(Buffer.from(p, 'base64url'));
  if (head.alg !== 'RS256') throw new Error('auth');
  const pem = (await googleCerts())[head.kid];
  if (!pem) throw new Error('auth');
  const ok = crypto.verify('RSA-SHA256', Buffer.from(`${h}.${p}`), new crypto.X509Certificate(pem).publicKey, Buffer.from(s, 'base64url'));
  const now = Math.floor(Date.now() / 1000);
  if (!ok || body.aud !== project || body.iss !== `https://securetoken.google.com/${project}` || !body.sub || body.exp < now || body.iat > now + 300 || !body.email) throw new Error('auth');
  return String(body.email).toLowerCase();
}
const owners = () => env('ADMIN_EMAILS').toLowerCase().split(/[,\s]+/).filter(Boolean);

// the signed-in person's role, or null if they have no access
async function roleOf(email) {
  if (owners().includes(email)) return 'admin';
  if (!F.ready()) return null;
  const d = await F.get(`users/${email}`);
  return d && d.data.active !== false && PERMS[d.data.role] ? d.data.role : null;
}

// checks the request; returns { email, role, can } or sends the error and returns null
async function who(req, res, need) {
  if (!env('FIREBASE_PROJECT_ID') || !env('ADMIN_EMAILS')) { F.send(res, 500, { error: 'إعداد ناقص في Vercel: FIREBASE_PROJECT_ID أو ADMIN_EMAILS' }); return null; }
  let email;
  try { email = await verifyToken((req.headers.authorization || '').replace(/^Bearer\s+/i, '')); }
  catch { F.send(res, 401, { error: 'سجّل الدخول تاني' }); return null; }
  let role = null;
  try { role = await roleOf(email); } catch (e) { console.error('[auth] role check', e.message, e.detail ? JSON.stringify(e.detail).slice(0, 500) : ''); F.send(res, 502, { error: 'ما قدرنا نتحقق من صلاحيتك، جرّب بعد شوية' }); return null; }
  if (!role) { F.send(res, 403, { error: 'الحساب ده ما عنده صلاحية على لوحة التحكم' }); return null; }
  const can = p => PERMS[role].includes(p);
  if (need && ![].concat(need).every(can)) { F.send(res, 403, { error: `صلاحيتك (${ROLE_NAME[role]}) ما تسمح بالعملية دي` }); return null; }
  return { email, role, can };
}

// ---------- GitHub (the site's repository) ----------
async function gh(path, opts = {}) {
  const r = await fetch(`https://api.github.com/repos/${env('GITHUB_REPO')}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${env('GITHUB_TOKEN')}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'wahaj-admin', ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  if (!r.ok) throw new Error(`github ${r.status}`);
  return r.json();
}

// ---------- activity log (best effort: never blocks the action itself) ----------
async function log(email, what, detail = '') {
  if (!F.ready()) return;
  const id = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  try { await F.commit([{ path: `log/${id}`, data: { at: new Date().toISOString(), email, what: F.txt(what, 200), detail: F.txt(detail, 300) }, exists: false }]); } catch {}
}

module.exports = { PERMS, ROLE_NAME, verifyToken, roleOf, who, owners, gh, log };
