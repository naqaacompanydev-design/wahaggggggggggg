// Wahaj gift card page (/gift/card/): fills the card from the link the calculator made,
// opens the gift box, lets the recipient pick a date on WhatsApp and save the card as an image.
(async () => {
  const page = document.querySelector('.gcp');
  if (!page) return;
  const q = new URLSearchParams(location.search);
  let G = { occasions: [] };
  try { G = await (await fetch('/data/gift.json', { cache: 'no-store' })).json(); } catch {}
  const WA = '966550771338';

  // a link without a recipient shows a sample card
  const demo = !q.get('t');
  const d = demo
    ? { f: 'سارة', t: 'نورة', o: 'bride', m: '', s: ['تنظيف المنازل والفلل', 'تنظيف الكنب والسجاد والموكيت'], w: 'later', d: '' }
    : { f: q.get('f') || '', t: q.get('t') || '', o: q.get('o') || 'none', m: q.get('m') || '', r: +q.get('r') || 0, s: (q.get('s') || '').split('|').filter(Boolean), w: q.get('w') || '', d: q.get('d') || '' };
  const occ = G.occasions.find(o => o.id === d.o) || G.occasions.find(o => o.id === 'none') || { emoji: '🎁', title: 'هدية لك', ready: [''] };
  const msg = d.m || occ.ready[d.r || 0] || occ.ready[0];
  const later = d.w === 'later';
  const card = !demo && /^WG-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(q.get('c') || '') ? { code: q.get('c'), value: +q.get('v') || 0 } : null;

  const set = (k, v) => page.querySelectorAll(`[data-gc="${k}"]`).forEach(e => { e.textContent = v; });
  set('emoji', occ.emoji); set('title', occ.title); set('to', d.t); set('from', d.f); set('msg', `«${msg}»`);
  set('date', card ? `رصيد هديتك: ${card.value} ريال · الكود: ${card.code}` : later ? '' : d.d ? `موعدك: ${d.d}` : '');
  page.querySelectorAll('[data-gc="svcs"]').forEach(ul => { ul.innerHTML = ''; d.s.forEach(s => { const li = document.createElement('li'); li.textContent = s; ul.append(li); }); });
  set('hi', `${d.t}، وصلتك هدية 🎁`);
  set('sub', `من ${d.f}. اضغط على الصندوق وافتحها.`);
  document.title = `${d.t}، لك هدية من ${d.f} | وهج`;
  page.querySelector('.gcp__demo').hidden = !demo;

  const pick = page.querySelector('[data-pick]');
  if (later) {
    const t = `السلام عليكم، أنا ${d.t}. وصلتني هدية تنظيف من ${d.f} 🎁 (${d.s.join('، ')}) وأبغى أحدد الموعد.`;
    pick.href = `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;
  } else if (card) {
    // value card: use the balance in the calculator
    pick.href = `/price-calculator/?gc=${card.code}`; pick.removeAttribute('target');
    pick.innerHTML = 'استخدم هديتك واحجز';
  } else pick.hidden = true;

  // confetti pieces
  const conf = page.querySelector('.gconf');
  const cols = ['#D9577A', '#96CC8A', '#2C70A8', '#F2B705', '#F4A7BB'];
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('i');
    const a = (i / 28) * Math.PI * 2;
    p.style.cssText = `background:${cols[i % cols.length]};--x:${Math.round(Math.cos(a) * (120 + (i % 5) * 30))}px;--y:${Math.round(Math.sin(a) * (110 + (i % 4) * 30) - 60)}px;--r:${(i * 47) % 360}deg`;
    conf.append(p);
  }
  const open = () => { page.classList.add('is-open'); set('sub', card ? 'اختر الخدمة من حاسبة الأسعار، ورصيد هديتك يتخصم من طلبك.' : later ? 'اختر موعدك، ونجي ننظف عندك بدون ما تدفع شي.' : 'نجي ننظف عندك في الموعد، بدون ما تدفع شي.'); page.querySelector('.gcp__card').removeAttribute('aria-hidden'); page.querySelector('.gc').focus({ preventScroll: true }); };
  page.querySelector('.gbox').addEventListener('click', open);
  if (q.get('open')) open();

  // save the card as an image (drawn on a canvas so it works on any phone)
  page.querySelector('[data-save]').addEventListener('click', async e => {
    const b = e.currentTarget, label = b.textContent;
    b.textContent = 'جارٍ تجهيز الصورة…';
    try {
      await document.fonts.ready;
      const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d');
      const bg = x.createLinearGradient(0, 0, W * .6, H); bg.addColorStop(0, '#1F2540'); bg.addColorStop(.55, '#24406B'); bg.addColorStop(1, '#2C70A8');
      x.fillStyle = bg; x.fillRect(0, 0, W, H);
      const glow = (cx, cy, r, col) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); };
      glow(W / 2, H + 80, 700, 'rgba(150,204,138,.45)'); glow(W - 80, 60, 520, 'rgba(244,167,187,.35)');
      x.direction = 'rtl'; x.textAlign = 'center';
      const F = (w, s) => `${w} ${s}px Cairo, system-ui, sans-serif`;
      const logo = new Image(); logo.src = '/assets/logo.webp';
      await new Promise(r => { logo.onload = r; logo.onerror = r; });
      if (logo.naturalWidth) { const lh = 84, lw = logo.naturalWidth * lh / logo.naturalHeight; x.fillStyle = '#fff'; x.beginPath(); x.roundRect(W - 70 - lw - 40, 64, lw + 40, lh + 20, 26); x.fill(); x.drawImage(logo, W - 70 - lw - 20, 74, lw, lh); }
      const wrap = (t, maxW) => { const out = []; let line = ''; for (const w of t.split(' ')) { const tr = line ? `${line} ${w}` : w; if (x.measureText(tr).width > maxW && line) { out.push(line); line = w; } else line = tr; } if (line) out.push(line); return out; };
      let y = 500;
      x.font = F(400, 110); x.fillStyle = '#fff'; x.fillText(occ.emoji, W / 2, y); y += 90;
      x.font = F(700, 40); x.fillStyle = '#FFD3DE'; x.fillText(occ.title, W / 2, y); y += 90;
      x.font = F(800, 76); x.fillStyle = '#fff'; x.fillText(`إلى ${d.t}`, W / 2, y); y += 90;
      x.font = F(500, 44); x.fillStyle = '#E6ECF7';
      wrap(`«${msg}»`, 820).slice(0, 4).forEach(l => { x.fillText(l, W / 2, y); y += 76; });
      y += 14; x.font = F(600, 38); x.fillStyle = '#C9D4E8'; x.fillText(`مع حبي، ${d.f}`, W / 2, y);
      x.strokeStyle = 'rgba(255,255,255,.28)'; x.setLineDash([10, 10]); x.lineWidth = 2; x.beginPath(); x.moveTo(110, 1090); x.lineTo(W - 110, 1090); x.stroke();
      x.font = F(500, 32); x.fillStyle = '#C9D4E8'; x.fillText('هديتك من وهج لخدمات التنظيف', W / 2, 1150);
      x.font = F(700, 38); x.fillStyle = '#DDF2D6'; x.fillText(d.s.join(' + ').slice(0, 60), W / 2, 1210);
      if (later) { x.font = F(600, 32); x.fillStyle = '#fff'; x.fillText('حدد موعدك مع وهج على واتساب', W / 2, 1270); }
      if (!later && d.d) { x.font = F(600, 32); x.fillStyle = '#fff'; x.fillText(`موعدك: ${d.d}`, W / 2, 1270); }
      const a = document.createElement('a'); a.download = 'wahaj-gift.png'; a.href = c.toDataURL('image/png'); a.click();
      b.textContent = 'تم حفظ الصورة ✓';
    } catch { b.textContent = label; alert('ما قدرنا نجهز الصورة. خذ لقطة شاشة للكارت.'); }
  });
})();
