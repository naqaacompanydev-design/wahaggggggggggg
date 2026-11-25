// Shared server helpers (files starting with "_" are not public endpoints on Vercel).
// Firestore through its REST API with the service account from the Vercel settings — no extra packages.
// Needs: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.
const crypto = require('crypto');

const env = k => (process.env[k] || '').trim();
const ready = () => !!(env('FIREBASE_PROJECT_ID') && env('FIREBASE_CLIENT_EMAIL') && env('FIREBASE_PRIVATE_KEY'));

// ---------- access token for the service account ----------
let tok = null, tokUntil = 0;
async function token() {
  if (tok && Date.now() < tokUntil) return tok;
  const b64u = s => Buffer.from(s).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify({ iss: env('FIREBASE_CLIENT_EMAIL'), scope: 'https://www.googleapis.com/auth/cloud-platform', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const key = env('FIREBASE_PRIVATE_KEY').replace(/,\s*$/, '').replace(/^"|"$/g, '').replace(/\\n/g, '\n').replace(/\r/g, '');
  if (!/-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----/.test(key)) throw new Error('FIREBASE_PRIVATE_KEY: missing BEGIN/END PRIVATE KEY lines');
  const sig = crypto.sign('RSA-SHA256', Buffer.from(`${head}.${body}`), key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${body}.${sig}` }) });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error(`firestore auth: ${j.error || r.status} ${j.error_description || ''}`.trim());
  tok = j.access_token; tokUntil = Date.now() + (j.expires_in - 120) * 1000;
  return tok;
}

// ---------- value conversion ----------
function toFs(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFs) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toFs(x)])) } };
}
function fromFs(v) {
  if (!v) return null;
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFs);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fromFs(x)]));
  return null;
}
const root = () => `projects/${env('FIREBASE_PROJECT_ID')}/databases/(default)/documents`;
const api = p => `https://firestore.googleapis.com/v1/${p}`;

async function req(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  if (r.status === 404) return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(`firestore ${r.status}`); e.status = r.status; e.detail = j; throw e; }
  return j;
}
// one document: { data, updateTime } or null
async function get(path) {
  const d = await req(api(`${root()}/${path}`));
  return d ? { data: fromFs({ mapValue: { fields: d.fields || {} } }), updateTime: d.updateTime } : null;
}
// all documents of a collection (small collections only: users, log)
async function list(col, max = 300) {
  const d = await req(api(`${root()}/${col}?pageSize=${max}`));
  return ((d && d.documents) || []).map(x => ({ id: x.name.split('/').pop(), data: fromFs({ mapValue: { fields: x.fields || {} } }) }));
}
async function remove(path) { return req(api(`${root()}/${path}`), { method: 'DELETE' }); }

// writes: [{ path, data, exists?: false, updateTime?: '…' }] — all or nothing
async function commit(writes) {
  return req(api(`${root()}:commit`), { method: 'POST', body: { writes: writes.map(w => ({
    update: { name: `${root()}/${w.path}`, fields: toFs(w.data).mapValue.fields },
    ...(w.exists === false ? { currentDocument: { exists: false } } : w.updateTime ? { currentDocument: { updateTime: w.updateTime } } : {})
  })) } });
}

// ---------- small shared helpers ----------
const send = (res, code, obj) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); };
const body = req => { let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } } return b && typeof b === 'object' ? b : {}; };
const txt = (v, max = 300) => String(v ?? '').replace(/[<>]/g, '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const code = v => String(v || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^A-Za-z0-9-]/g, '').toUpperCase().slice(0, 30);
const today = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10); // Riyadh date

// a coupon is usable now? returns a reason in Arabic, or null
function couponProblem(c) {
  if (!c || c.active === false) return 'الكود غير صحيح أو انتهى.';
  const d = today();
  if (c.start && d < c.start) return 'الكود لسه ما بدأ.';
  if (c.end && d > c.end) return 'الكود انتهى.';
  if (c.maxUses && (c.uses || 0) >= c.maxUses) return 'الكود خلص عدد مرات استخدامه.';
  return null;
}
// only what the calculator needs to work out the discount
const couponPublic = c => ({ code: c.code, type: c.type, value: c.value, max: c.max || null, min: c.min || 0, services: c.services && c.services.length ? c.services : null, label: c.label || '' });

module.exports = { env, ready, token, get, list, remove, commit, send, body, txt, code, today, couponProblem, couponPublic };
