// Runs inside /_edit/ pages (opened by the admin in a frame): click any text to type over it, click any image to replace it.
// Talks to the admin page through window.parent.WahajAdmin (same site).
(() => {
  const A = window.parent && window.parent !== window ? window.parent.WahajAdmin : null;
  const page = document.documentElement.dataset.editPage;
  const scope = k => (k[0] === 's' ? 'shell' : 'page');
  const items = new Map();

  // wrap every marked text run in a span the visitor can type in
  function wrap() {
    document.querySelectorAll('[data-tk]').forEach(el => {
      const keys = el.dataset.tk.split(' ').map(x => { const [k, o] = x.split(':'); return { k, o }; });
      const runs = [...el.childNodes].filter(n => n.nodeType === 3 && n.nodeValue.trim());
      if (runs.length !== keys.length) return; // the page's own script changed this element: leave it alone
      runs.forEach((n, i) => {
        // its own tag, so no site style written for <span> can change how the text looks
        const sp = document.createElement('we-t');
        sp.dataset.k = keys[i].k; sp.dataset.o = keys[i].o;
        // only the words are editable; the spaces around them stay, so the design keeps its spacing
        const v = n.nodeValue, lead = v.match(/^\s*/)[0], trail = v.match(/\s*$/)[0];
        sp.textContent = v.trim();
        n.replaceWith(...[lead && document.createTextNode(lead), sp, trail && document.createTextNode(trail)].filter(Boolean));
        items.set(keys[i].k, sp);
      });
      el.removeAttribute('data-tk');
    });
    document.querySelectorAll('img[data-ik]').forEach(img => {
      const [k, o] = img.dataset.ik.split(':');
      img.dataset.k = k; img.dataset.o = o; img.classList.add('we-i');
      img.removeAttribute('srcset'); img.removeAttribute('loading');
      items.set(k, img);
    });
  }

  // show changes that are saved in the admin but not published yet
  function apply(changes) {
    for (const c of changes || []) {
      const el = items.get(c.key); if (!el || el.dataset.o !== c.o) continue;
      if (c.t != null && el.tagName === 'WE-T') el.textContent = c.t;
      if (c.src && el.tagName === 'IMG') el.src = c.preview || c.src;
      if (c.alt != null && el.tagName === 'IMG') el.alt = c.alt;
      el.classList.add('we-changed');
    }
  }

  // links and forms do nothing while editing
  document.addEventListener('click', e => {
    const t = e.target.closest('we-t');
    const img = e.target.closest('img.we-i');
    if (e.target.closest('a,button,summary,label,form')) e.preventDefault();
    if (t) { e.preventDefault(); edit(t); return; }
    if (img) { e.preventDefault(); A && A.pickImage({ page, scope: scope(img.dataset.k), key: img.dataset.k, o: img.dataset.o, src: img.getAttribute('src'), alt: img.alt }); }
  }, true);
  document.addEventListener('submit', e => e.preventDefault(), true);

  let cur = null;
  function edit(sp) {
    if (cur === sp) return;
    done();
    cur = sp; sp.dataset.before = sp.textContent;
    try { sp.contentEditable = 'plaintext-only'; } catch { sp.contentEditable = 'true'; }
    if (sp.contentEditable !== 'plaintext-only') sp.contentEditable = 'true';
    sp.classList.add('we-on');
    sp.focus();
    const r = document.createRange(); r.selectNodeContents(sp); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  function done() {
    if (!cur) return;
    const sp = cur; cur = null;
    sp.contentEditable = 'false'; sp.classList.remove('we-on');
    const text = sp.textContent.replace(/\s+/g, ' ').trim();
    if (!text) { sp.textContent = sp.dataset.before; return; } // empty text is not allowed: it would leave a hole in the design
    if (text !== sp.dataset.before.replace(/\s+/g, ' ').trim()) {
      sp.classList.add('we-changed');
      A && A.change({ page, scope: scope(sp.dataset.k), key: sp.dataset.k, o: sp.dataset.o, t: text });
    }
  }
  document.addEventListener('keydown', e => {
    if (!cur) return;
    if (e.key === 'Enter') { e.preventDefault(); done(); }
    if (e.key === 'Escape') { cur.textContent = cur.dataset.before; done(); }
  });
  document.addEventListener('focusout', e => { if (e.target === cur) done(); });
  document.addEventListener('paste', e => { if (!cur) return; e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData.getData('text/plain') || '').replace(/\s+/g, ' ')); });

  // the admin can ask to update an image or undo a change
  window.WahajEdit = {
    setImage(key, url, alt) { const im = items.get(key); if (im) { if (url) im.src = url; if (alt != null) im.alt = alt; im.classList.add('we-changed'); } },
    reset(key, o) { const el = items.get(key); if (!el) return; el.classList.remove('we-changed'); },
    count: () => items.size
  };

  const start = () => { wrap(); apply(A && A.pending(page)); A && A.ready(page, items.size); };
  // let the page's own scripts (reviews, offers…) render first
  if (document.readyState === 'complete') setTimeout(start, 50); else addEventListener('load', () => setTimeout(start, 50));
})();
