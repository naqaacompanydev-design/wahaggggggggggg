// POST /api/order — records an order sent from the calculator (the customer also sends it on WhatsApp),
// counts the coupon use and deducts the gift card balance. The calculator does not wait for it.
const F = require('./_fs');
const num = v => (Number.isFinite(+v) && +v >= 0 ? Math.round(+v * 100) / 100 : 0);

// read, check, write with a precondition; retried if someone else changed the document meanwhile
async function update(path, change, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const d = await F.get(path); if (!d) return null;
    const next = change(d.data); if (!next) return null;
    try { await F.commit([{ path, data: next, updateTime: d.updateTime }]); return next; }
    catch (e) { if (e.status !== 400 && e.status !== 409) throw e; }
  }
  return null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return F.send(res, 405, { error: 'POST فقط' });
  if (!F.ready()) return F.send(res, 503, { error: 'not-configured' });
  const b = F.body(req);
  if (!/^W-[A-Z0-9]{6}$/.test(b.id || '')) return F.send(res, 400, { error: 'رقم طلب غير صالح' });
  const raw = (Array.isArray(b.items) ? b.items : []).slice(0, 30);
  const items = raw.map(x => ({ sid: F.txt(x.sid, 30), n: F.txt(x.n, 120), t: num(x.t), d: F.txt(x.d, 400) }));
  if (!items.length) return F.send(res, 400, { error: 'الطلب فاضي' });
  const sub = items.reduce((a, x) => a + x.t, 0);
  const g = b.giftTo || null;
  const order = {
    id: b.id, status: 'new', createdAt: new Date().toISOString(), source: ['gift', 'inspect'].includes(b.source) ? b.source : 'calc',
    items, sub, couponCode: '', off: 0, giftCode: '', giftUsed: 0,
    date: F.txt(b.date, 40), period: F.txt(b.period, 20), name: F.txt(b.name, 80), city: F.txt(b.city, 60), district: F.txt(b.district, 80),
    short: F.txt(b.short, 12), notes: F.txt(b.notes, 600), map: /^https:\/\/maps\.google\.com\/\?q=[-\d.,]+$/.test(b.map || '') ? b.map : '',
    giftTo: g ? { name: F.txt(g.name, 80), phone: F.txt(g.phone, 20), occasion: F.txt(g.occasion, 40), message: F.txt(g.message, 200) } : null
  };
  try {
    // coupon: counted only if it is still valid for this order
    const cc = F.code(b.coupon);
    if (cc) {
      let off = 0;
      const used = await update(`coupons/${cc}`, c => {
        if (F.couponProblem(c)) return null;
        const base = c.services && c.services.length ? items.filter(x => c.services.includes(x.sid)).reduce((a, x) => a + x.t, 0) : sub;
        if (!base || sub < (c.min || 0)) return null;
        off = c.type === 'percent' ? base * c.value / 100 : c.value;
        if (c.max) off = Math.min(off, c.max);
        off = Math.min(Math.round(off), base);
        return { ...c, uses: (c.uses || 0) + 1, totalOff: (c.totalOff || 0) + off };
      });
      if (used) { order.couponCode = cc; order.off = off; } else order.couponRejected = cc;
    }
    // gift card: takes up to what is left to pay
    const gc = F.code(b.gift);
    if (gc) {
      let take = 0;
      const due = sub - order.off;
      const ok = await update(`giftcards/${gc}`, c => {
        if (c.status === 'void' || (c.expires && F.today() > c.expires) || !(c.balance > 0)) return null;
        take = Math.min(c.balance, due);
        return { ...c, balance: Math.round((c.balance - take) * 100) / 100, used: [...(c.used || []), { order: order.id, amount: take, at: order.createdAt }] };
      });
      if (ok) { order.giftCode = gc; order.giftUsed = take; } else order.giftRejected = gc;
    }
    order.total = Math.max(0, sub - order.off - order.giftUsed);
    await F.commit([{ path: `orders/${order.id}`, data: order, exists: false }]);
    return F.send(res, 200, { ok: true, id: order.id, off: order.off, giftUsed: order.giftUsed, total: order.total });
  } catch (e) { console.error('[api/order]', e.message, e.detail ? JSON.stringify(e.detail).slice(0, 500) : ''); return F.send(res, 502, { error: 'ما قدرنا نسجل الطلب' }); }
};
