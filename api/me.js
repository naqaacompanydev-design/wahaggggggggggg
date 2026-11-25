// GET /api/me — the signed-in person's role and what they may do (the admin shows only those sections).
const F = require('./_fs');
const A = require('./_auth');
module.exports = async (req, res) => {
  const me = await A.who(req, res); if (!me) return;
  F.send(res, 200, { ok: true, email: me.email, role: me.role, roleName: A.ROLE_NAME[me.role], perms: A.PERMS[me.role], owner: A.owners().includes(me.email) });
};
