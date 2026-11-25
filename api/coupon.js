// POST /api/coupon { code } — checks a discount code. Returns only that coupon's terms (never the list of codes).
// The calculator works out the discount from these terms; the use is counted when the order is sent (/api/order).
const F = require('./_fs');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return F.send(res, 405, { error: 'POST فقط' });
  if (!F.ready()) return F.send(res, 503, { error: 'not-configured' });
  const c = F.code(F.body(req).code);
  if (c.length < 3) return F.send(res, 400, { error: 'اكتب كود الخصم.' });
  try {
    const d = await F.get(`coupons/${c}`);
    const why = F.couponProblem(d && d.data);
    if (why) return F.send(res, 404, { error: `«${c}»: ${why}` });
    return F.send(res, 200, { ok: true, coupon: F.couponPublic({ ...d.data, code: c }) });
  } catch { return F.send(res, 502, { error: 'ما قدرنا نتحقق من الكود الحين. جرّب بعد شوية.' }); }
};
