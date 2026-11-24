// Dark hero (service pages + Riyadh page): Riyadh-time greeting, self-typing line,
// and — when an orbit is present — the lit orbit item and the card under it, all on one clock.
(() => {
  const hero = document.querySelector('.o-hero');
  if (!hero) return;
  const tw = hero.querySelector('#tw');
  const items = [...hero.querySelectorAll('.o-item')];
  const chip = hero.querySelector('.o-chip');

  const h = +new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Riyadh' }).format(new Date());
  const morning = h >= 4 && h < 12;
  hero.querySelector('#o-greet').textContent = morning ? 'صباح الخير' : 'مساء الخير';
  hero.querySelector('#o-tod use').setAttribute('href', morning ? '#i-sun' : '#i-moon');

  const words = items.length ? items.map(x => x.dataset.verb) : JSON.parse(tw?.dataset.words || '[]');
  const show = i => {
    if (!items.length) return;
    const it = items[i];
    items.forEach(x => x.classList.toggle('is-on', x === it));
    if (!chip) return;
    chip.querySelector('b').textContent = it.dataset.name;
    chip.querySelector('small').textContent = it.dataset.desc;
    chip.querySelector('.o-chip__ic').innerHTML = it.querySelector('.o-ico').innerHTML;
    if (it.dataset.href) chip.href = it.dataset.href;
  };
  if (!tw || !words.length) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { show(0); return; }

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  (async function loop() {
    for (let i = 0; ; i = (i + 1) % words.length) {
      show(i);
      const w = words[i];
      for (let k = 1; k <= w.length; k++) { tw.textContent = w.slice(0, k); await sleep(70); }
      await sleep(1700);
      for (let k = w.length; k >= 0; k--) { tw.textContent = w.slice(0, k); await sleep(35); }
      await sleep(250);
    }
  })();
})();
