const drawer=document.getElementById('drawer'),tog=document.querySelector('.nav__actions .nav__toggle');
tog.addEventListener('click',()=>{drawer.classList.add('is-open');tog.setAttribute('aria-expanded','true');document.body.style.overflow='hidden'});
drawer.querySelector('[data-close]').addEventListener('click',()=>{drawer.classList.remove('is-open');tog.setAttribute('aria-expanded','false');document.body.style.overflow=''});

// "طلباتي": the visitor's saved order (kept on this device by the price calculator), reachable from every page
(() => {
  const btn = document.querySelector('.nav__cart'), box = document.getElementById('my-orders');
  if (!btn || !box) return;
  const body = document.getElementById('mo-body'), badge = btn.querySelector('.nav__cart-n');
  const fmt = n => new Intl.NumberFormat('en-US').format(Math.round(n));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const read = () => { try { return JSON.parse(localStorage.getItem('wahaj-calc') || 'null'); } catch { return null; } };
  const onCalc = () => !!document.querySelector('.calc-page');
  let last = null, sure = false;

  function badgeUpdate() {
    const n = read()?.cart?.length || 0;
    badge.textContent = n; badge.hidden = !n;
    btn.setAttribute('aria-label', n ? `طلباتي، ${n} ${n === 1 ? 'خدمة' : 'خدمات'}` : 'طلباتي');
  }
  function render() {
    const d = read(), s = d?.sum, n = d?.cart?.length || 0;
    if (!n || !s?.items?.length) {
      body.innerHTML = `<div class="orders__empty"><svg class="ico" aria-hidden="true"><use href="#i-bag"/></svg><b>ما عندك طلبات محفوظة</b><p>احسب سعر الخدمات اللي تبيها، وطلبك يتحفظ هنا حتى لو طلعت من الموقع.</p><a class="btn btn--primary" href="/price-calculator/"><svg class="ico" aria-hidden="true"><use href="#i-calc"/></svg>احسب السعر وابدأ طلبك</a></div>`;
      return;
    }
    const when = s.at ? new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Riyadh' }).format(s.at) : '';
    body.innerHTML = `
      <p class="orders__meta">${n === 1 ? 'خدمة وحدة' : n === 2 ? 'خدمتين' : `${n} خدمات`} في طلبك${when ? ` · آخر تعديل ${esc(when)}` : ''}</p>
      <ul class="orders__list">${s.items.map(i => `<li><span class="orders__ic"><svg aria-hidden="true"><use href="#${document.getElementById(i.ic) ? esc(i.ic) : 'i-spark'}"/></svg></span><span>${esc(i.n)}</span><b>${fmt(i.t)} ريال</b></li>`).join('')}</ul>
      ${s.off ? `<div class="orders__row orders__row--off"><span>خصم الكوبون <b dir="ltr">${esc(s.code || '')}</b></span><span>− ${fmt(s.off)} ريال</span></div>` : ''}
      <div class="orders__row orders__total"><span>الإجمالي التقريبي</span><b>${fmt(s.total)} ريال</b></div>
      <p class="orders__inst">أو 4 دفعات × ${fmt(Math.ceil(s.total / 4))} ريال مع تابي وتمارا</p>
      <div class="orders__act">
        <a class="btn btn--primary" href="/price-calculator/?go=cart">كمّل الحجز</a>
        <a class="btn btn--ghost" href="/price-calculator/">أضف أو عدّل خدمات</a>
      </div>
      <button type="button" class="orders__clear" data-mo-clear>${sure ? 'متأكد؟ اضغط مرة ثانية للمسح' : 'امسح الطلب'}</button>
      <p class="orders__note">طلبك محفوظ على هذا الجهاز، والسعر تقريبي ويتأكد قبل البدء.</p>`;
  }
  function open() {
    last = document.activeElement; sure = false; render();
    box.hidden = false; requestAnimationFrame(() => box.classList.add('is-open'));
    btn.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden';
    box.querySelector('.orders__x').focus();
  }
  function close() {
    box.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = '';
    setTimeout(() => { box.hidden = true; }, 250); if (last && last.focus) last.focus();
  }
  btn.addEventListener('click', open);
  box.addEventListener('click', e => {
    if (e.target.closest('[data-mo-close]')) return close();
    if (e.target.closest('[data-mo-clear]')) {
      if (!sure) { sure = true; return render(); }
      try { localStorage.removeItem('wahaj-calc'); } catch {}
      badgeUpdate(); if (onCalc()) return location.reload();
      sure = false; render();
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !box.hidden) close(); });
  window.addEventListener('wahaj:orders', badgeUpdate);
  window.addEventListener('storage', e => { if (e.key === 'wahaj-calc') { badgeUpdate(); if (!box.hidden) render(); } });
  badgeUpdate();
})();
