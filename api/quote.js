// /api/quote — the customer's view of a price quote made in the admin.
// GET ?id=…&k=…  returns the quote (k is the secret in the link) and marks it "viewed".
// POST { id, k, action: 'accept' | 'reject' } records the customer's answer.
const F = require('./_fs');
const fields = ['no', 'customer', 'items', 'discount', 'vat', 'notes', 'valid', 'status', 'createdAt', 'acceptedAt'];
module.exports = async (req, res) => {
  if (!F.ready()) return F.send(res, 503, { error: 'not-configured' });
  const q = req.method === 'GET' ? (req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams)) : F.body(req);
  const id = String(q.id || ''), k = String(q.k || '');
  if (!/^[A-Za-z0-9-]{6,40}$/.test(id) || k.length < 16) return F.send(res, 400, { error: 'رابط غير صالح' });
  try {
    const d = await F.get(`quotes/${id}`);
    if (!d || d.data.k !== k) return F.send(res, 404, { error: 'عرض السعر غير موجود' });
    const qd = d.data;
    if (req.method === 'GET') {
      if (qd.status === 'sent') { qd.status = 'viewed'; qd.viewedAt = new Date().toISOString(); await F.commit([{ path: `quotes/${id}`, data: qd, updateTime: d.updateTime }]).catch(() => {}); }
      return F.send(res, 200, { ok: true, quote: Object.fromEntries(fields.map(f => [f, qd[f] ?? null])) });
    }
    if (req.method !== 'POST') return F.send(res, 405, { error: 'غير مسموح' });
    const action = q.action === 'accept' ? 'accepted' : q.action === 'reject' ? 'rejected' : null;
    if (!action) return F.send(res, 400, { error: 'اختيار غير صالح' });
    if (qd.status === 'accepted' || qd.status === 'rejected') return F.send(res, 200, { ok: true, status: qd.status });
    if (qd.valid && F.today() > qd.valid) return F.send(res, 410, { error: 'عرض السعر انتهت صلاحيته. تواصل معنا ونجدده لك.' });
    qd.status = action; qd[action === 'accepted' ? 'acceptedAt' : 'rejectedAt'] = new Date().toISOString();
    await F.commit([{ path: `quotes/${id}`, data: qd, updateTime: d.updateTime }]);
    return F.send(res, 200, { ok: true, status: action });
  } catch (e) { console.error('[api/quote]', e.message, e.detail ? JSON.stringify(e.detail).slice(0, 500) : ''); return F.send(res, 502, { error: 'حصل خطأ، جرّب بعد شوية' }); }
};
