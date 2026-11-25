// Customer's quote page (/quote/?id=…&k=…): shows a quote made in the admin, accept it, print it as PDF.
// Without the server (local preview / demo) the quote is read from this device's demo data.
(async () => {
  const $ = id => document.getElementById(id);
  const fmt = n => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
  const day = d => d ? new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d)) : '—';
  const q = new URLSearchParams(location.search), id = q.get('id') || '', k = q.get('k') || '';
  const WA = '966550771338';
  const local = () => { try { const d = JSON.parse(localStorage.getItem('wahaj-db-quotes') || '{}')[id]; return d && d.k === k ? d : null; } catch { return null; } };
  const saveLocal = d => { try { const all = JSON.parse(localStorage.getItem('wahaj-db-quotes') || '{}'); all[id] = d; localStorage.setItem('wahaj-db-quotes', JSON.stringify(all)); } catch {} };

  let Q = null, offline = false;
  try {
    const r = await fetch(`/api/quote?id=${encodeURIComponent(id)}&k=${encodeURIComponent(k)}`);
    const j = await r.json().catch(() => null);
    if (!j || j.error === 'not-configured') offline = true;
    else if (j.ok) Q = j.quote;
    else { $('qp-msg').textContent = j.error || 'عرض السعر غير موجود.'; return; }
  } catch { offline = true; }
  if (offline) { Q = local(); if (Q && Q.status === 'sent') { Q.status = 'viewed'; saveLocal(Q); } }
  if (!Q) { $('qp-msg').textContent = 'عرض السعر غير موجود. تأكد من الرابط أو تواصل معنا.'; return; }

  const items = Q.items || [];
  const sub = items.reduce((a, x) => a + (+x.qty || 0) * (+x.price || 0), 0);
  const disc = Math.min(+Q.discount || 0, sub);
  const vat = Q.vat ? Math.round((sub - disc) * 0.15 * 100) / 100 : 0;
  const total = sub - disc + vat;
  $('q-no').textContent = Q.no || '';
  $('q-date').textContent = day(Q.createdAt);
  $('q-valid').textContent = Q.valid ? day(Q.valid) : 'بدون تاريخ';
  $('q-to').textContent = Q.customer || '';
  $('q-items').innerHTML = items.map(x => `<tr><td>${String(x.label || '').replace(/[<>&]/g, '')}</td><td>${fmt(+x.qty || 0)}</td><td>${fmt(+x.price || 0)}</td><td>${fmt((+x.qty || 0) * (+x.price || 0))}</td></tr>`).join('');
  $('q-sum').innerHTML = `<div><dt>المجموع</dt><dd>${fmt(sub)} ريال</dd></div>`
    + (disc ? `<div class="off"><dt>الخصم</dt><dd>− ${fmt(disc)} ريال</dd></div>` : '')
    + (vat ? `<div><dt>ضريبة القيمة المضافة 15%</dt><dd>${fmt(vat)} ريال</dd></div>` : '')
    + `<div class="total"><dt>الإجمالي</dt><dd>${fmt(total)} ريال</dd></div>`;
  if (Q.notes) { $('q-notes').textContent = Q.notes; $('q-notes').hidden = false; }
  document.title = `عرض سعر ${Q.no || ''} | وهج`;
  $('q-wa').href = `https://wa.me/${WA}?text=${encodeURIComponent(`السلام عليكم، بخصوص عرض السعر رقم ${Q.no}`)}`;

  const expired = Q.valid && new Date().toISOString().slice(0, 10) > Q.valid;
  const showStatus = () => {
    const st = $('q-status');
    const msg = Q.status === 'accepted' ? '✓ وافقت على العرض. بنتواصل معك لتحديد الموعد.' : Q.status === 'rejected' ? 'العرض مرفوض.' : expired ? 'العرض انتهت صلاحيته. تواصل معنا ونجدده لك.' : '';
    st.textContent = msg; st.hidden = !msg; st.className = 'qdoc__status' + (Q.status === 'accepted' ? ' is-ok' : '');
    $('q-accept').hidden = !!msg;
  };
  showStatus();
  $('q-accept').addEventListener('click', async e => {
    const b = e.currentTarget; b.disabled = true; b.textContent = 'جارٍ الإرسال…';
    let ok = false;
    if (!offline) {
      try { const r = await fetch('/api/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, k, action: 'accept' }) }); const j = await r.json(); ok = !!j.ok; if (!ok) alert(j.error || 'ما قدرنا نرسل موافقتك.'); } catch { alert('ما قدرنا نرسل موافقتك. تأكد من الإنترنت.'); }
    } else { Q.status = 'accepted'; Q.acceptedAt = new Date().toISOString(); saveLocal(Q); ok = true; }
    if (ok) { Q.status = 'accepted'; showStatus(); window.open(`https://wa.me/${WA}?text=${encodeURIComponent(`السلام عليكم، وافقت على عرض السعر رقم ${Q.no} (${fmt(total)} ريال). متى أقرب موعد؟`)}`, '_blank', 'noopener'); }
    else { b.disabled = false; b.innerHTML = '<svg class="ico"><use href="#i-check"/></svg>أوافق على العرض'; }
  });
  $('q-print').addEventListener('click', () => window.print());
  $('qp-msg').hidden = true; $('qdoc').hidden = false;
})();
