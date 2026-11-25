// POST /api/gift { code } — checks a gift card and returns its balance (nothing else about it).
// The balance is deducted when the order is sent (/api/order).
const F = require('./_fs');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return F.send(res, 405, { error: 'POST فقط' });
  if (!F.ready()) return F.send(res, 503, { error: 'not-configured' });
  const c = F.code(F.body(req).code);
  if (c.length < 6) return F.send(res, 400, { error: 'اكتب كود كارت الإهداء.' });
  try {
    const d = await F.get(`giftcards/${c}`);
    const g = d && d.data;
    if (!g || g.status === 'void') return F.send(res, 404, { error: 'الكود غير صحيح.' });
    if (g.expires && F.today() > g.expires) return F.send(res, 404, { error: 'الكارت انتهت صلاحيته.' });
    if (!(g.balance > 0)) return F.send(res, 404, { error: 'رصيد الكارت خلص.' });
    return F.send(res, 200, { ok: true, gift: { code: c, balance: g.balance, to: g.to || '' } });
  } catch { return F.send(res, 502, { error: 'ما قدرنا نتحقق من الكارت الحين. جرّب بعد شوية.' }); }
};
