// Applies the general settings from the admin (data/settings.json) to every exported file in <dir>:
// phone and WhatsApp numbers, email, social links, the 3 brand colours, the logo and the installment badges.
// The site's source keeps the original values (ORIGINAL below); only the exported copy changes.
// Run: node tools/settings.mjs dist        (build-all.mjs runs it after content.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// the values written in the site's source files
export const ORIGINAL = {
  phone: '0550771338', whatsapp: '0550771338', email: 'info@wahjclean.sa',
  colors: { primary: '#2C70A8', secondary: '#96CC8A', dark: '#1F2540' },
  logo: '/assets/logo.webp'
};

// Saudi mobile in its three written forms: 0550771338, 966550771338, +966 55 077 1338
export const phoneForms = p => {
  const d = String(p || '').replace(/\D/g, '').replace(/^(00966|966)/, '').replace(/^0/, '');
  return { local: '0' + d, intl: '966' + d, spaced: `+966 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}` };
};
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SOCIAL = { snap: 's--snap', ig: 's--ig', tt: 's--tt', x: 's--x', yt: 's--yt' };

export function applySettings(text, s, ext) {
  let out = text;
  const swap = (from, to) => { if (from && to && from !== to) out = out.split(from).join(to); };
  const o = ORIGINAL;
  const call = phoneForms(s.phone || o.phone), oc = phoneForms(o.phone);
  const wa = phoneForms(s.whatsapp || s.phone || o.whatsapp), ow = phoneForms(o.whatsapp);
  // WhatsApp links first, then the call number everywhere else
  swap(`wa.me/${ow.intl}`, `wa.me/${wa.intl}`);
  swap(`"whatsapp": "${ow.intl}"`, `"whatsapp": "${wa.intl}"`);
  swap(`'${ow.intl}'`, `'${wa.intl}'`);
  swap(`"${ow.intl}"`, `"${wa.intl}"`);
  swap(`+${oc.intl}`, `+${call.intl}`);
  swap(oc.spaced, call.spaced);
  swap(oc.local, call.local);
  swap(o.email, s.email);
  if (s.logo) swap(o.logo, s.logo);
  // colours: every place the exact brand colour is written (CSS, inline styles, SVG)
  for (const k of ['primary', 'secondary', 'dark']) {
    const from = o.colors[k], to = (s.colors || {})[k];
    if (to && /^#[0-9a-f]{6}$/i.test(to) && to.toLowerCase() !== from.toLowerCase()) out = out.replace(new RegExp(reEsc(from), 'gi'), to);
  }
  if (ext === '.html') {
    // social links: set the link, or remove the icon when there is no account
    for (const [k, cls] of Object.entries(SOCIAL)) {
      const url = ((s.social || {})[k] || '').trim();
      const re = new RegExp(`<li><a class="s ${cls}" href="[^"]*"([\\s\\S]*?)</li>`, 'g');
      out = out.replace(re, (m, rest) => (/^https:\/\/[^\s"<>]+$/.test(url) ? `<li><a class="s ${cls}" href="${url.replace(/&/g, '&amp;')}" target="_blank" rel="noopener"${rest}</li>` : ''));
    }
    if (s.installments === false) out = out.replace('</head>', '<style>.float,.pay,.paynote,.side-pay,.o-pay,#side-inst,#pn-inst,.orders__inst,.cart-sum>small{display:none!important}</style>\n</head>');
  }
  return out;
}

function run(dir) {
  let s;
  try { s = JSON.parse(fs.readFileSync(path.join(root, 'data', 'settings.json'), 'utf8')); } catch { return console.log('settings: none'); }
  const exts = new Set(['.html', '.css', '.js', '.json', '.xml', '.svg']);
  let n = 0;
  const walk = d => {
    for (const x of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, x.name);
      if (x.isDirectory()) { if (x.name !== 'admin') walk(p); continue; }
      const ext = path.extname(x.name);
      if (!exts.has(ext) || /settings\.json$|admin[\w-]*\.(js|css)$|content\.json$/.test(x.name)) continue;
      const a = fs.readFileSync(p, 'utf8'), b = applySettings(a, s, ext);
      if (a !== b) { fs.writeFileSync(p, b); n++; }
    }
  };
  walk(dir);
  console.log(`settings: updated ${n} files`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run(path.resolve(process.argv[2] || path.join(root, 'dist')));
