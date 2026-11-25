// /api/history — published versions of the site's content (admins only).
// GET  → the last 30 publishes (each one is a commit that changed data/).
// POST { sha } → undoes that publish: the data files it changed go back to how they were before it,
//               as a new publish (so the undo itself can be undone too).
const F = require('./_fs');
const A = require('./_auth');

module.exports = async (req, res) => {
  const me = await A.who(req, res, 'log'); if (!me) return;
  if (!F.env('GITHUB_TOKEN') || !F.env('GITHUB_REPO')) return F.send(res, 500, { error: 'إعداد ناقص في Vercel: GITHUB_TOKEN و GITHUB_REPO' });
  const branch = F.env('GITHUB_BRANCH') || 'main';
  try {
    if (req.method === 'GET') {
      const list = await A.gh(`/commits?sha=${encodeURIComponent(branch)}&path=data&per_page=30`);
      return F.send(res, 200, { ok: true, versions: list.map(c => ({ sha: c.sha, message: c.commit.message.split('\n')[0], at: c.commit.author.date })) });
    }
    if (req.method !== 'POST') return F.send(res, 405, { error: 'غير مسموح' });
    const sha = String(F.body(req).sha || '');
    if (!/^[0-9a-f]{40}$/.test(sha)) return F.send(res, 400, { error: 'نسخة غير صالحة' });
    const c = await A.gh(`/commits/${sha}`);
    const parent = c.parents && c.parents[0] && c.parents[0].sha;
    if (!parent) return F.send(res, 400, { error: 'ما نقدر نرجع قبل أول نسخة' });
    const files = (c.files || []).filter(f => f.filename.startsWith('data/') && f.filename.endsWith('.json'));
    if (!files.length) return F.send(res, 400, { error: 'النسخة دي ما غيّرت محتوى' });
    const tree = [];
    for (const f of files) {
      if (f.status === 'added') { tree.push({ path: f.filename, mode: '100644', type: 'blob', sha: null }); continue; } // it did not exist before
      const old = await A.gh(`/contents/${f.filename}?ref=${parent}`);
      tree.push({ path: f.filename, mode: '100644', type: 'blob', sha: old.sha });
    }
    const ref = await A.gh(`/git/ref/heads/${encodeURIComponent(branch)}`);
    const head = await A.gh(`/git/commits/${ref.object.sha}`);
    const t = await A.gh('/git/trees', { method: 'POST', body: { base_tree: head.tree.sha, tree } });
    const msg = `لوحة التحكم: تراجع عن «${c.commit.message.split('\n')[0].replace(/^لوحة التحكم: /, '')}» — ${me.email}`;
    const n = await A.gh('/git/commits', { method: 'POST', body: { message: msg, tree: t.sha, parents: [head.sha] } });
    await A.gh(`/git/refs/heads/${encodeURIComponent(branch)}`, { method: 'PATCH', body: { sha: n.sha } });
    await A.log(me.email, 'تراجع عن نشر', c.commit.message.split('\n')[0]);
    return F.send(res, 200, { ok: true, commit: n.sha.slice(0, 7) });
  } catch (e) { console.error('[api/history]', e.message, e.detail ? JSON.stringify(e.detail).slice(0, 500) : ''); return F.send(res, 502, { error: 'ما قدرنا نكمل، جرّب بعد شوية' }); }
};
