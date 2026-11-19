// =====================================================================
//  Colombo Vapes ERP — Liquid Glass PWA
//  Offline-first: every write goes to the local cache first and syncs
//  to Firebase automatically when the internet comes back.
// =====================================================================
import { CONFIG } from './config.js';
import { createDB, INC } from './db.js';
import { SEED } from './seed.js';

// ---------------------------------------------------------------- utils
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = parseFloat(String(v ?? '').replace(/,/g, '')); return isFinite(n) ? n : 0; };
const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
const money = n => (Number(n) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qtyf = n => (Number(n) || 0).toLocaleString('en-LK', { maximumFractionDigits: 3 });
const pad = (n, l = 2) => String(n).padStart(l, '0');
const dayOf = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => dayOf();
const dStart = s => new Date(s + 'T00:00:00').getTime();
const dEnd = s => new Date(s + 'T23:59:59.999').getTime();
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return dayOf(d); };
const fmtDT = ts => { const d = new Date(ts); return `${dayOf(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtT = ts => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const by = (k, desc) => (a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (desc ? -1 : 1);
const sum = (arr, f) => arr.reduce((s, x) => s + (typeof f === 'function' ? f(x) : num(x[f])), 0);
const debounce = (f, ms = 120) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };

const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>',
  pos: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
  returns: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  stock: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  grn: '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  verify: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 13l2 2 4-4"/>',
  products: '<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  customers: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3"/>',
  suppliers: '<path d="M3 21V8l6-4v17M9 21h12V10l-6-3"/><path d="M13 13h4M13 17h4"/>',
  employees: '<rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="9" cy="12" r="2.5"/><path d="M5.5 17a3.5 3.5 0 0 1 7 0M15 10h3M15 14h3"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 10v4M18 10v4"/>',
  reports: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  print: '<path d="M6 9V2h12v7"/><rect x="2" y="9" width="20" height="9" rx="2"/><path d="M6 14h12v8H6z"/>',
  download: '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  barcode: '<path d="M3 5v14M7 5v14M10 5v14M14 5v14M17 5v14M21 5v14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>', pay: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  upload: '<path d="M12 21V9m0 0-4 4m4-4 4 4M4 3h16"/>'
};
const ic = (n, s = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${s}>${ICONS[n] || ''}</svg>`;

// ---------------------------------------------------------------- state
const S = {
  db: null, user: null, me: null,
  products: [], pmap: {}, customers: [], cmap: {}, suppliers: [], smap: {}, employees: [],
  meta: {}, recent: [], sync: { pending: 0, online: navigator.onLine },
  cart: [], priceType: 'retail', customerId: '', invDisc: 0
};
const isAdmin = () => S.me?.role === 'admin';
const shop = () => ({ ...CONFIG.shop, ...(S.meta.shop || {}) });
const cats = () => S.meta.categories || SEED.categories;
const expCats = () => S.meta.expenseCategories || SEED.expenseCategories;
const device = () => { try { return JSON.parse(localStorage.getItem('cv_device') || '{}'); } catch (e) { return {}; } };
const setDevice = d => localStorage.setItem('cv_device', JSON.stringify({ ...device(), ...d }));

// ---------------------------------------------------------------- UI helpers
function toast(msg, err) {
  const t = document.createElement('div');
  t.className = 'toast panel' + (err ? ' err' : ''); t.style.padding = '12px 16px'; t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), err ? 5000 : 2600);
}
function modal(title, body, { wide, onMount } = {}) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal panel ${wide ? 'wide' : ''}"><div class="row" style="margin-bottom:6px"><h2 class="grow" style="margin:0">${title}</h2><button class="btn sm" data-x>${ic('x')}</button></div><div class="mb" style="margin-top:12px">${body}</div></div>`;
  document.body.appendChild(bg);
  const close = () => { bg.remove(); document.removeEventListener('keydown', onEsc); };
  const onEsc = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onEsc);
  bg.addEventListener('mousedown', e => { if (e.target === bg) close(); });
  $('[data-x]', bg).onclick = close;
  onMount && onMount($('.modal', bg), close);
  const f = $('input:not([type=hidden]),select', bg); f && setTimeout(() => f.focus(), 50);
  return close;
}
function confirmBox(msg, okText = 'Yes') {
  return new Promise(res => {
    const close = modal('Confirm', `<p>${msg}</p><div class="acts"><button class="btn" data-n>Cancel</button><button class="btn p" data-y>${okText}</button></div>`, {
      onMount(m, c) { $('[data-n]', m).onclick = () => { c(); res(false); }; $('[data-y]', m).onclick = () => { c(); res(true); }; }
    });
  });
}
const formData = el => Object.fromEntries($$('[name]', el).map(i => [i.name, i.type === 'checkbox' ? i.checked : i.value]));
const opt = (v, t, sel) => `<option value="${esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${esc(t ?? v)}</option>`;
function downloadCSV(name, cols, rows) {
  const line = a => a.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
  const csv = [line(cols.map(c => c.t)), ...rows.map(r => line(cols.map(c => r[c.k])))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
  a.download = name + '.csv'; a.click();
}
function printHTML(html, cls = 'rep') {
  const p = $('#print'); p.className = cls; p.innerHTML = html;
  setTimeout(() => window.print(), 60);
}
function tableHTML(cols, rows, foot) {
  if (!rows.length) return '<div class="empty">No data</div>';
  const cell = (c, r) => { const v = r[c.k]; return `<td class="${c.num || c.money ? 'num' : ''}">${c.html ? c.html(r) : c.money ? money(v) : c.num ? qtyf(v) : esc(v)}</td>`; };
  return `<table><thead><tr>${cols.map(c => `<th class="${c.num || c.money ? 'num' : ''}">${esc(c.t)}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(r => `<tr>${cols.map(c => cell(c, r)).join('')}</tr>`).join('')}</tbody>
  ${foot ? `<tfoot><tr>${cols.map((c, i) => `<td class="${c.num || c.money ? 'num' : ''}">${foot[c.k] !== undefined ? (c.money ? money(foot[c.k]) : c.num ? qtyf(foot[c.k]) : esc(foot[c.k])) : i === 0 ? 'Total' : ''}</td>`).join('')}</tr></tfoot>` : ''}</table>`;
}
function printTable(title, sub, cols, rows, foot) {
  const s = shop();
  printHTML(`<div class="rep"><h1>${esc(s.name)} — ${esc(title)}</h1><div>${esc(sub || '')}</div><br>${tableHTML(cols.map(c => ({ ...c, html: null })), rows, foot)}<p style="font-size:10px">Printed ${fmtDT(Date.now())}</p></div>`);
}
async function commit(ops, okMsg) {
  try { await S.db.commit(ops); okMsg && toast(okMsg + (S.sync.online ? '' : ' (offline — will sync)')); return true; }
  catch (e) { console.error(e); toast('Could not save: ' + e.message, true); return false; }
}
const move = (p, qty, type, ref) => ({ op: 'set', col: 'stockMoves', id: S.db.newId('stockMoves'), data: { ts: Date.now(), day: today(), code: p.code, name: p.name, qty, type, ref: ref || '', before: num(p.stock), by: S.me?.username || '' } });

// ---------------------------------------------------------------- boot
const root = $('#root');
(async function boot() {
  root.innerHTML = `<div class="login"><div class="dim">Loading…</div></div>`;
  try { S.db = await createDB(); }
  catch (e) { root.innerHTML = `<div class="login"><div class="card">Could not load Firebase. Please check your internet connection.<br><small class="dim">${esc(e.message)}</small></div></div>`; return; }
  S.db.onSync(s => { S.sync = s; renderSync(); });
  S.db.onAuth(async u => {
    S.user = u;
    if (!u) { S.me = null; return renderLogin(); }
    startWatchers();
  });
})();

let unsubs = [];
function startWatchers() {
  unsubs.forEach(f => f && f()); unsubs = [];
  // cached profile + settings let the app open instantly; live data replaces them a moment later
  const cache = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const cMe = cache('cv_me_' + S.user.username), cMeta = cache('cv_meta');
  if (cMe) { S.me = cMe; S.employees = S.employees.length ? S.employees : [cMe]; }
  if (cMeta) S.meta = cMeta;
  let ready = { emp: !!cMe, meta: !!cMe };
  const go = () => { if (ready.emp && ready.meta && !S._started) { S._started = true; afterLogin(); } };
  setTimeout(go, 0);
  unsubs.push(S.db.watch('employees', (list, m = {}) => {
    S.employees = list.sort(by('name'));
    const me = list.find(e => e.id === S.user.username) || null;
    // a brand-new device first sees an empty cache; wait for the server copy
    if (!me && m.fromCache && navigator.onLine && !cMe) return;
    if (me) { S.me = me; try { localStorage.setItem('cv_me_' + S.user.username, JSON.stringify(me)); } catch (e) {} }
    else if (!m.fromCache && !m.error) S.me = null;
    if (S._started && S.me && S.me.active === false) { S.db.logout(); return; }
    ready.emp = true; go();
  }, { meta: true }));
  unsubs.push(S.db.watch('meta', (list, m = {}) => { S.meta = list.find(d => d.id === 'settings') || S.meta || {}; if (!m.error) try { localStorage.setItem('cv_meta', JSON.stringify(S.meta)); } catch (e) {} ready.meta = true; go(); if (S._started && !m.error) rerenderSoft(); }));
  unsubs.push(S.db.watch('products', list => {
    S.products = list.map(p => ({ ...p, code: p.code || p.id })).sort(by('name'));
    S.pmap = Object.fromEntries(S.products.map(p => [p.code, p]));
    rerenderSoft('products');
  }));
  unsubs.push(S.db.watch('customers', list => { S.customers = list.sort(by('name')); S.cmap = Object.fromEntries(list.map(c => [c.id, c])); rerenderSoft('customers'); }));
  unsubs.push(S.db.watch('suppliers', list => { S.suppliers = list.sort(by('name')); S.smap = Object.fromEntries(list.map(c => [c.id, c])); rerenderSoft('suppliers'); }));
  const since = dStart(addDays(today(), -40));
  unsubs.push(S.db.watch('invoices', list => { S.recent = list.sort(by('ts', true)); rerenderSoft('invoices'); }, { since }));
}

async function afterLogin() {
  // First login ever: make this user the admin.
  if (!S.me && S.user.username === 'admin') {
    const doc = { username: S.user.username, name: S.user.username === 'admin' ? 'Admin' : S.user.username, role: 'admin', phone: '', active: true, ts: Date.now() };
    root.innerHTML = `<div class="login"><div class="card">Setting up for the first time…</div></div>`;
    try { await S.db.commitWait([{ op: 'set', col: 'employees', id: S.user.username, data: doc }]); }
    catch (e) { root.innerHTML = `<div class="login"><div class="card">Setup failed: ${esc(e.message)}<br><br><button class="btn" onclick="location.reload()">Retry</button></div></div>`; return; }
    location.reload(); return;
  }
  if (!S.me) { root.innerHTML = `<div class="login"><div class="card">This user has no employee account. Please contact the admin.<br><br><button class="btn" onclick="location.reload()">Retry</button></div></div>`; return; }
  if (S.me.active === false) { await S.db.logout(); toast('This account has been deactivated', true); return; }
  if (!device().code) setDevice({ code: 'A' });
  renderShell();
  window.addEventListener('hashchange', () => { $$('.modal-bg').forEach(m => m.remove()); route(); }); // never leave a popup over a new page
  route();
}

// ---------------------------------------------------------------- login
function renderLogin() {
  S._started = false;
  const demo = S.db.mode === 'demo';
  root.innerHTML = `<div class="login"><form class="card" id="lf">
    <div class="brand" style="flex-direction:column;padding:0 0 18px"><div class="logo">CV</div><b style="font-size:20px">${esc(CONFIG.shop.name)}</b><small>ERP System</small></div>
    <label class="f">Username<input name="u" autocomplete="username" required></label><br>
    <label class="f">Password<input name="p" type="password" autocomplete="current-password" required></label><br>
    <button class="btn p lg" style="width:100%">Log In</button>
    ${demo ? `<p class="dim" style="font-size:12px;margin-top:14px;text-align:center">Demo mode (Firebase not configured)<br>admin / admin123</p>` : ''}
  </form></div>`;
  $('#lf').onsubmit = async e => {
    e.preventDefault(); const f = formData(e.target);
    const b = $('button', e.target); b.disabled = true; b.textContent = 'Signing in…';
    try { await S.db.login(f.u.trim(), f.p); }
    catch (err) { toast(/network/.test(err.code || err.message) ? 'Internet is required for the first login' : 'Incorrect username or password', true); b.disabled = false; b.textContent = 'Log In'; }
  };
}

// ---------------------------------------------------------------- shell
const NAV = [
  ['dashboard', 'Dashboard', 0], ['pos', 'Invoice / POS', 0], ['returns', 'Returns', 0], ['stock', 'Stock', 0],
  ['grn', 'GRN', 1], ['verify', 'Stock Verify', 1], ['products', 'Products', 1], ['sep'],
  ['customers', 'Customers', 0], ['suppliers', 'Suppliers', 1], ['employees', 'Employees', 1], ['cash', 'Cash In / Out', 1],
  ['reports', 'Reports', 1], ['settings', 'Settings', 1]
];
function renderShell() {
  const items = NAV.filter(n => n[0] === 'sep' || !n[2] || isAdmin());
  root.innerHTML = `<div id="app">
    <aside class="side panel"><div class="brand"><div class="logo">CV</div><div><b>${esc(shop().name)}</b><small>ERP</small></div></div>
      <nav class="nav">${items.map(n => n[0] === 'sep' ? '<div class="sep"></div>' : `<a href="#/${n[0]}" data-r="${n[0]}">${ic(n[0])}${n[1]}</a>`).join('')}</nav>
      <div class="me"><div class="row">${ic('user', 'width="18"')}<div class="grow"><b style="color:var(--ink)">${esc(S.me.name)}</b><br>${esc(S.me.role)} · Device ${esc(device().code)}</div><button class="btn sm" id="lo" title="Logout">${ic('logout')}</button></div></div>
    </aside>
    <header class="top"><h1 id="title"></h1><span class="pill" id="sync"></span></header>
    <main id="main"></main>
    <nav class="tabbar panel">${[['dashboard', 'Home'], ['pos', 'POS'], ['stock', 'Stock'], ['customers', 'Customers']].map(([r, t]) => `<a href="#/${r}" data-r="${r}">${ic(r)}${t}</a>`).join('')}<a href="javascript:void 0" id="more">${ic('more')}More</a></nav>
  </div>`;
  $('#lo').onclick = async () => { if (await confirmBox('Log out now?')) { S._started = false; await S.db.logout(); location.hash = ''; } };
  $('#more').onclick = () => modal('Menu', `<div class="tiles">${items.filter(n => n[0] !== 'sep').map(n => `<a class="tile panel" href="#/${n[0]}"><span class="ic">${ic(n[0])}</span>${n[1]}</a>`).join('')}<a class="tile panel" id="lo2"><span class="ic">${ic('logout')}</span>Logout</a></div>`, {
    onMount(m, c) { $$('a[href]', m).forEach(a => a.addEventListener('click', c)); $('#lo2', m).onclick = async () => { c(); S._started = false; await S.db.logout(); }; }
  });
  renderSync();
}
function renderSync() {
  const el = $('#sync'); if (!el) return;
  const { pending, online } = S.sync;
  if (S.db.mode === 'demo') el.innerHTML = `<span class="dot off"></span>Demo mode`;
  else if (!online) el.innerHTML = `<span class="dot off"></span>Offline${pending ? ` · ${pending} pending` : ''}`;
  else if (pending) el.innerHTML = `<span class="dot sync"></span>Syncing ${pending}…`;
  else el.innerHTML = `<span class="dot"></span>Online · Synced`;
}

// ---------------------------------------------------------------- router
const VIEWS = {};
let cur = { name: '', arg: '' };
function route() {
  if (!S._started) return;
  const [name = 'dashboard', arg = ''] = location.hash.replace(/^#\/?/, '').split('/');
  const v = VIEWS[name] || VIEWS.dashboard;
  const navDef = NAV.find(n => n[0] === name);
  if (((navDef && navDef[2]) || name === 'report') && !isAdmin()) { location.hash = '#/dashboard'; return; }
  cur = { name: VIEWS[name] ? name : 'dashboard', arg };
  $$('[data-r]').forEach(a => a.classList.toggle('on', a.dataset.r === cur.name));
  const main = $('#main'); main.scrollTop = 0;
  $('#title').textContent = v.title(arg);
  main.innerHTML = `<div class="view">${v.html(arg)}</div>`;
  v.mount && v.mount($('.view', main), arg);
}
// live data changed -> refresh only views that show that data (POS keeps its cart)
const rerenderSoft = debounce(kind => {
  if (!S._started || !$('#main')) return;
  const v = VIEWS[cur.name]; if (!v) return;
  if (v.live && (!kind || v.live.includes(kind))) { if (v.refresh) v.refresh(); else route(); }
}, 150);

// ================================================================ DASHBOARD
VIEWS.dashboard = {
  title: () => `Hi, ${S.me.name.split(' ')[0]} 👋`,
  live: ['invoices', 'products', 'customers', 'suppliers'],
  html() {
    const t = today(), inv = S.recent.filter(i => i.status !== 'void');
    const tInv = inv.filter(i => i.day === t);
    const sales = sum(tInv, 'total'), profit = sum(tInv, 'profit'), cash = sum(tInv, i => num(i.pay?.cash) - num(i.change));
    const days = [...Array(7)].map((_, i) => addDays(t, i - 6));
    const dTot = days.map(d => sum(inv.filter(i => i.day === d), 'total'));
    const mx = Math.max(...dTot, 1);
    const low = S.products.filter(p => p.active !== false && num(p.stock) <= num(p.reorder) && (num(p.retail) > 0));
    const supOut = sum(S.suppliers, 'balance'), cusOut = sum(S.customers, 'balance');
    const monthInv = inv.filter(i => i.day.slice(0, 7) === t.slice(0, 7));
    const tiles = [['pos', 'Invoice', 'F2', 'rgba(141,198,63,.4)'], ['returns', 'Return', '', 'rgba(255,181,71,.35)'], ['stock', 'Stock', '', 'rgba(70,214,255,.35)'], ['grn', 'GRN', '', 'rgba(155,123,255,.4)', 1], ['verify', 'Stock Verify', '', 'rgba(70,214,255,.35)', 1], ['products', 'Products', '', 'rgba(141,198,63,.35)', 1], ['customers', 'Customers', '', 'rgba(255,181,71,.35)'], ['suppliers', 'Suppliers', supOut ? 'Rs ' + money(supOut) : '', 'rgba(255,93,108,.35)', 1], ['employees', 'Employees', '', 'rgba(155,123,255,.4)', 1], ['cash', 'Cash In/Out', '', 'rgba(141,198,63,.35)', 1], ['reports', 'Reports', '', 'rgba(70,214,255,.35)', 1], ['settings', 'Settings', '', 'rgba(255,255,255,.25)', 1]]
      .filter(x => !x[4] || isAdmin());
    return `${!S.products.length && isAdmin() ? `<div class="card" style="margin-bottom:14px;border-color:rgba(184,240,90,.5)"><div class="row"><div class="grow"><b>Import data from the old ERP</b><div class="muted">Products 71, stock, suppliers, expense categories.</div></div><button class="btn p" id="imp">${ic('upload')}Import now</button></div></div>` : ''}
    <div class="grid g4">
      <div class="stat card"><div class="k">Today sales</div><div class="v">${money(sales)}</div><div class="s">${tInv.length} invoices</div></div>
      ${isAdmin() ? `<div class="stat card"><div class="k">Today profit</div><div class="v good">${money(profit)}</div><div class="s">Month: ${money(sum(monthInv, 'profit'))}${monthInv.some(i => i.imported) ? ' (new bills)' : ''}</div></div>` : `<div class="stat card"><div class="k">Cash sales</div><div class="v">${money(cash)}</div><div class="s">today</div></div>`}
      <div class="stat card"><div class="k">This month</div><div class="v">${money(sum(monthInv, 'total'))}</div><div class="s">${monthInv.length} invoices</div></div>
      <div class="stat card"><div class="k">Low stock</div><div class="v ${low.length ? 'warn' : ''}">${low.length}</div><div class="s">items at reorder level</div></div>
    </div><br>
    <div class="tiles">${tiles.map(x => `<a class="tile panel" href="#/${x[0]}"><span class="ic" style="--glow:${x[3]}">${ic(x[0])}</span>${x[1]}${x[2] ? `<small>${x[2]}</small>` : ''}</a>`).join('')}</div><br>
    <div class="grid g2">
      <div class="card"><h2>Last 7 days</h2><div class="bars">${days.map((d, i) => `<div class="b" title="${d}: ${money(dTot[i])}"><i style="height:${(dTot[i] / mx) * 100}%"></i><span>${d.slice(8)}</span></div>`).join('')}</div></div>
      <div class="card"><h2>Recent invoices</h2>${inv.slice(0, 6).map(i => `<div class="row" style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,.06)"><b style="width:70px">${esc(i.no)}</b><span class="grow muted">${fmtDT(i.ts)} · ${esc(i.customerName)}</span><b class="num">${money(i.total)}</b></div>`).join('') || '<div class="empty">No invoices yet</div>'}</div>
    </div><br>
    <div class="grid g2">
      <div class="card"><h2>Low stock</h2>${low.slice(0, 8).map(p => `<div class="row" style="padding:5px 0"><span class="grow">${esc(p.name)}</span><span class="tag ${num(p.stock) <= 0 ? 'r' : 'a'}">${qtyf(p.stock)}</span></div>`).join('') || '<div class="dim">All good ✓</div>'}</div>
      <div class="card"><h2>Balances</h2><div class="row" style="padding:5px 0"><span class="grow">Customer credit (receivable)</span><b>${money(cusOut)}</b></div><div class="row" style="padding:5px 0"><span class="grow">Supplier outstanding (payable)</span><b class="${supOut ? 'bad' : ''}">${money(supOut)}</b></div><div class="row" style="padding:5px 0"><span class="grow">Stock value (cost)</span><b>${money(sum(S.products, p => num(p.stock) * num(p.cost)))}</b></div></div>
    </div>`;
  },
  mount(el) { const b = $('#imp', el); if (b) b.onclick = importSeed; }
};

async function importSeed() {
  if (!(await confirmBox('Import 71 products, stock, 3 suppliers and expense categories from the old ERP?', 'Import'))) return;
  const ops = [];
  for (const p of SEED.products) {
    ops.push({ op: 'set', col: 'products', id: p.code, data: { ...p, ts: Date.now() } });
    if (p.stock) ops.push({ op: 'set', col: 'stockMoves', id: S.db.newId('stockMoves'), data: { ts: Date.now(), day: today(), code: p.code, name: p.name, qty: p.stock, type: 'opening', ref: 'Old ERP', before: 0, by: S.me.username } });
  }
  for (const s of SEED.suppliers) ops.push({ op: 'set', col: 'suppliers', id: S.db.newId('suppliers'), data: { ...s, ts: Date.now() } });
  ops.push({ op: 'set', col: 'meta', id: 'settings', merge: true, data: { categories: SEED.categories, expenseCategories: SEED.expenseCategories, imported: Date.now() } });
  setDevice({ code: device().code || 'A', seq: Math.max(device().seq || 0, SEED.nextInvoiceNo - 1) });
  for (let i = 0; i < ops.length; i += 400) await commit(ops.slice(i, i + 400));
  toast('Import complete ✓');
}

// ================================================================ POS
function priceOf(p, type) { return num(type === 'wholesale' ? p.wholesale : type === 'loyalty' ? p.loyalty : p.retail) || num(p.retail); }
function nextInvNo() {
  const d = device(); const code = d.code || 'A';
  const mine = S.recent.filter(i => i.device === code).map(i => num(String(i.no).replace(/\D/g, '')));
  const seq = Math.max(d.seq || 0, ...mine, 0) + 1;
  setDevice({ seq });
  return `${code}${seq}`;
}
function cartTotals() {
  const sub = r2(sum(S.cart, l => l.qty * l.price - num(l.disc)));
  const disc = String(S.invDisc).includes('%') ? r2(sub * num(S.invDisc) / 100) : r2(num(S.invDisc));
  const total = r2(Math.max(0, sub - disc));
  const cost = r2(sum(S.cart, l => l.qty * num(l.cost)));
  return { sub, disc, total, cost, items: sum(S.cart, 'qty') };
}
VIEWS.pos = {
  title: () => 'Invoice',
  live: ['products', 'customers'],
  html() {
    return `<div class="pos">
      <div class="cart panel">
        <div class="total"><div><div class="dim" style="font-size:12px;letter-spacing:1px;text-transform:uppercase">Invoice total</div><div class="v" id="tot">0.00</div></div><div class="num dim" id="tsub"></div></div>
        <div class="lines" id="lines"></div>
        <div style="padding:14px 16px;border-top:1px solid var(--line)" class="row">
          <div class="grow row" style="gap:8px"><select id="cus" style="max-width:240px"></select><button class="btn sm" id="ncus" title="New customer">${ic('plus')}</button></div>
          <input id="idisc" placeholder="Discount (e.g. 500 or 5%)" style="max-width:200px">
        </div>
        <div style="padding:0 16px 16px" class="row">
          <button class="btn" id="hold">${ic('pause')}Hold</button><button class="btn" id="recall">Recall <span class="tag" id="hc">0</span></button>
          <button class="btn d" id="clr">${ic('trash')}Clear</button><span class="grow"></span>
          <button class="btn p lg" id="pay">${ic('pay')}Pay (F9)</button>
        </div>
      </div>
      <div class="right">
        <div class="seg" id="ptype">${[['retail', 'Retail'], ['wholesale', 'Wholesale'], ['loyalty', 'Loyalty']].map(([k, t]) => `<button data-t="${k}" class="${S.priceType === k ? 'on' : ''}">${t}</button>`).join('')}</div>
        <div class="search">${ic('search')}<input id="q" placeholder="Barcode scan / code / name (F2)" autocomplete="off"><div class="sugg panel" id="sugg"></div></div>
        <div class="seg" id="catf"><button data-c="" class="on">All</button>${cats().map(c => `<button data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
        <div class="results" id="res"></div>
      </div></div>
      <div class="paybar panel"><div class="grow" id="ptap"><small class="dim">Total · <span id="pcnt">0</span> items</small><b id="ptot">0.00</b></div><button class="btn p lg" id="pay2">${ic('pay')}Pay</button></div>`;
  },
  mount(el) {
    let cat = '';
    const q = $('#q', el);
    const drawRes = () => {
      const s = q.value.trim().toLowerCase();
      let list = S.products.filter(p => p.active !== false && (!cat || p.category === cat));
      if (s) list = list.filter(p => p.code.toLowerCase().includes(s) || p.name.toLowerCase().includes(s) || (p.barcode || '').toLowerCase() === s);
      list = list.sort((a, b) => (num(b.stock) > 0) - (num(a.stock) > 0)).slice(0, window.innerWidth < 900 && !s ? 24 : 80);
      $('#res', el).innerHTML = list.map((p, i) => `<div class="prod ${num(p.stock) <= 0 ? 'out' : ''} ${s && i === 0 ? 'hl' : ''}" data-code="${esc(p.code)}"><div class="nm">${esc(p.name)}</div><div class="pr">${money(priceOf(p, S.priceType))}</div><div class="st ${num(p.stock) <= 0 ? 'bad' : 'dim'}">${esc(p.code)} · Stock ${qtyf(p.stock)}</div></div>`).join('') || '<div class="empty">No products found</div>';
    };
    const drawCart = () => {
      const t = cartTotals();
      $('#tot', el).textContent = money(t.total); $('#ptot', el).textContent = money(t.total); $('#pcnt', el).textContent = qtyf(t.items);
      $('#tsub', el).innerHTML = `${qtyf(t.items)} items${t.disc ? `<br>Disc -${money(t.disc)}` : ''}`;
      $('#lines', el).innerHTML = S.cart.map((l, i) => `<div class="line"><div class="n">${esc(l.name)}<small>${esc(l.code)} · stock ${qtyf(S.pmap[l.code]?.stock)}</small></div>
        <div class="qty"><button data-dq="${i}" data-v="-1">−</button><input data-q="${i}" value="${l.qty}" inputmode="decimal"><button data-dq="${i}" data-v="1">+</button></div>
        <input data-p="${i}" value="${l.price}" style="width:96px;text-align:right;padding:6px" inputmode="decimal">
        <div class="row" style="gap:6px"><b class="num" style="min-width:86px">${money(l.qty * l.price - num(l.disc))}</b><button class="btn sm" data-rm="${i}">${ic('x')}</button></div></div>`).join('') || `<div class="empty">${ic('pos', 'width="40" style="opacity:.4"')}<br>Scan or tap a product to add it</div>`;
      $('#hc', el).textContent = held().length;
    };
    const drawCus = () => {
      $('#cus', el).innerHTML = opt('', 'Cash customer', S.customerId) + S.customers.filter(c => c.active !== false).map(c => opt(c.id, `${c.name}${c.phone ? ' · ' + c.phone : ''}${num(c.balance) ? ' (Rs ' + money(c.balance) + ')' : ''}`, S.customerId)).join('');
    };
    // dropdown under the search bar: matching items that are in stock
    let sIdx = 0, sList = [];
    const drawSugg = () => {
      const s = q.value.trim().toLowerCase(), box = $('#sugg', el);
      sList = s ? S.products.filter(p => p.active !== false && num(p.stock) > 0 && (p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s) || (p.barcode || '').toLowerCase() === s)).slice(0, 12) : [];
      sIdx = Math.min(sIdx, Math.max(0, sList.length - 1));
      if (!s) { box.style.display = 'none'; return; }
      box.style.display = 'block';
      box.innerHTML = sList.length ? sList.map((p, i) => `<div class="si ${i === sIdx ? 'on' : ''}" data-code="${esc(p.code)}"><div class="grow"><b>${esc(p.name)}</b><small class="dim">${esc(p.code)} · ${esc(p.category || '')}</small></div><span class="tag g">${qtyf(p.stock)} in stock</span><b class="num">${money(priceOf(p, S.priceType))}</b></div>`).join('') : '<div class="si dim">No items in stock for this search</div>';
    };
    const hideSugg = () => { $('#sugg', el).style.display = 'none'; };
    const add = code => {
      const p = S.pmap[code]; if (!p) return toast('Product not found: ' + code, true);
      const l = S.cart.find(x => x.code === code);
      if ((l ? l.qty : 0) + 1 > num(p.stock)) return toast(num(p.stock) > 0 ? `${p.name}: only ${qtyf(p.stock)} in stock` : `${p.name} is out of stock`, true);
      if (l) l.qty++; else S.cart.push({ code, name: p.name, qty: 1, price: priceOf(p, S.priceType), cost: num(p.cost), disc: 0 });
      drawCart();
    };
    this.refresh = () => { drawRes(); drawCus(); drawCart(); };
    this.refresh();
    $('#idisc', el).value = S.invDisc || '';
    q.oninput = () => { sIdx = 0; drawSugg(); debounce(drawRes, 60)(); };
    q.onfocus = drawSugg;
    q.onblur = () => setTimeout(hideSugg, 180);
    q.onkeydown = e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sIdx = (sIdx + (e.key === 'ArrowDown' ? 1 : -1) + sList.length) % (sList.length || 1); drawSugg(); return; }
      if (e.key === 'Escape') { hideSugg(); return; }
      if (e.key !== 'Enter') return;
      const s = q.value.trim(); if (!s) return;
      const exact = S.products.find(p => p.code === s || p.barcode === s || p.code === s.padStart(5, '0'));
      if (exact) add(exact.code); else if (sList[sIdx]) add(sList[sIdx].code); else return toast('No item in stock matches "' + s + '"', true);
      q.value = ''; drawSugg(); drawRes();
    };
    $('#sugg', el).addEventListener('mousedown', e => {
      const r = e.target.closest('[data-code]'); if (!r) return;
      e.preventDefault(); add(r.dataset.code); q.value = ''; drawSugg(); drawRes();
      if (window.innerWidth >= 900) q.focus(); else q.blur();
    });
    $('#res', el).onclick = e => { const p = e.target.closest('.prod'); if (p) { add(p.dataset.code); q.focus(); } };
    $('#catf', el).onclick = e => { const b = e.target.closest('button'); if (!b) return; cat = b.dataset.c; $$('#catf button', el).forEach(x => x.classList.toggle('on', x === b)); drawRes(); };
    $('#ptype', el).onclick = e => {
      const b = e.target.closest('button'); if (!b) return; S.priceType = b.dataset.t;
      $$('#ptype button', el).forEach(x => x.classList.toggle('on', x === b));
      S.cart.forEach(l => { const p = S.pmap[l.code]; if (p) l.price = priceOf(p, S.priceType); });
      drawRes(); drawCart();
    };
    $('#lines', el).onclick = e => {
      const dq = e.target.closest('[data-dq]'), rm = e.target.closest('[data-rm]');
      if (dq) { const l = S.cart[dq.dataset.dq], st = num(S.pmap[l.code]?.stock); const n = Math.max(1, r2(l.qty + num(dq.dataset.v))); if (n > st) toast(`Only ${qtyf(st)} in stock`, true); else l.qty = n; drawCart(); }
      if (rm) { S.cart.splice(rm.dataset.rm, 1); drawCart(); }
    };
    $('#lines', el).onchange = e => {
      const i = e.target.dataset.q ?? e.target.dataset.p; if (i === undefined) return;
      if (e.target.dataset.q !== undefined) { const st = num(S.pmap[S.cart[i].code]?.stock); let n = Math.max(0.001, num(e.target.value) || 1); if (n > st) { toast(`Only ${qtyf(st)} in stock`, true); n = Math.max(1, st); } S.cart[i].qty = n; }
      else S.cart[i].price = num(e.target.value);
      setTimeout(drawCart, 0);
    };
    $('#cus', el).onchange = e => {
      S.customerId = e.target.value;
      const c = S.cmap[S.customerId];
      if (c?.priceType && c.priceType !== S.priceType) $(`#ptype [data-t="${c.priceType}"]`, el)?.click();
    };
    $('#ncus', el).onclick = () => customerModal(null, id => { S.customerId = id; setTimeout(drawCus, 200); });
    $('#idisc', el).oninput = e => { S.invDisc = e.target.value.trim(); drawCart(); };
    $('#clr', el).onclick = () => { S.cart = []; S.invDisc = ''; $('#idisc', el).value = ''; drawCart(); };
    $('#hold', el).onclick = () => {
      if (!S.cart.length) return;
      const h = held(); h.push({ ts: Date.now(), cart: S.cart, customerId: S.customerId, priceType: S.priceType, disc: S.invDisc, total: cartTotals().total });
      localStorage.setItem('cv_held', JSON.stringify(h)); S.cart = []; S.invDisc = ''; drawCart(); toast('Bill put on hold');
    };
    $('#recall', el).onclick = () => {
      const h = held(); if (!h.length) return toast('No bills on hold');
      modal('Held bills', h.map((b, i) => `<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)"><span class="grow">${fmtDT(b.ts)} · ${b.cart.length} items · <b>${money(b.total)}</b></span><button class="btn sm p" data-i="${i}">Open</button><button class="btn sm d" data-del="${i}">${ic('trash')}</button></div>`).join(''), {
        onMount(m, close) {
          m.onclick = e => {
            const o = e.target.closest('[data-i]'), d = e.target.closest('[data-del]');
            if (o) { const b = h.splice(o.dataset.i, 1)[0]; S.cart = b.cart; S.customerId = b.customerId; S.priceType = b.priceType; S.invDisc = b.disc; localStorage.setItem('cv_held', JSON.stringify(h)); close(); route(); }
            if (d) { h.splice(d.dataset.del, 1); localStorage.setItem('cv_held', JSON.stringify(h)); close(); drawCart(); }
          };
        }
      });
    };
    $('#pay', el).onclick = () => payModal(() => { S.cart = []; S.invDisc = ''; S.customerId = ''; route(); });
    $('#pay2', el).onclick = () => $('#pay', el).click();
    $('#ptap', el).onclick = () => $('.cart', el).scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (window.innerWidth >= 900) setTimeout(() => q.focus(), 50);
  }
};
const held = () => { try { return JSON.parse(localStorage.getItem('cv_held') || '[]'); } catch (e) { return []; } };
document.addEventListener('keydown', e => {
  if (!S._started) return;
  if (e.key === 'F2') { e.preventDefault(); if (cur.name !== 'pos') location.hash = '#/pos'; else $('#q')?.focus(); }
  if (e.key === 'F9' && cur.name === 'pos' && !$('.modal-bg')) { e.preventDefault(); $('#pay')?.click(); }
});

function payModal(done) {
  if (!S.cart.length) return toast('Cart is empty', true);
  const short = S.cart.find(l => l.qty > num(S.pmap[l.code]?.stock));
  if (short) return toast(`${short.name}: only ${qtyf(S.pmap[short.code]?.stock)} in stock now`, true);
  const t = cartTotals(), cus = S.cmap[S.customerId];
  const methods = ['cash', 'card', 'transfer', 'cheque', ...(cus ? ['credit'] : [])];
  modal('Payment', `<div class="row" style="justify-content:space-between;margin-bottom:14px"><span class="muted">${esc(cus?.name || 'Cash customer')}</span><span style="font-size:30px;font-weight:800">Rs ${money(t.total)}</span></div>
    <div class="form">${methods.map(m => `<label class="f">${m[0].toUpperCase() + m.slice(1)}<input name="${m}" inputmode="decimal" placeholder="0.00" ${m === 'cash' ? `value="${t.total}"` : ''}></label>`).join('')}</div>
    <div class="row" style="margin-top:12px;gap:6px">${[t.total, 1000, 5000, 10000, 20000].filter((v, i, a) => a.indexOf(v) === i && v >= t.total).slice(0, 4).map(v => `<button class="btn sm" data-cash="${v}">Cash ${money(v)}</button>`).join('')}</div>
    <div class="card" style="margin-top:14px;padding:14px"><div class="row"><span class="grow">Paid</span><b id="pd"></b></div><div class="row"><span class="grow">Balance / Change</span><b id="ch" style="font-size:22px"></b></div></div>
    <label class="row" style="margin-top:12px;gap:8px"><input type="checkbox" name="print" ${localStorage.getItem('cv_noprint') ? '' : 'checked'}> Print receipt</label>
    <div class="acts"><button class="btn" data-x2>Cancel</button><button class="btn p lg" id="go">Complete sale</button></div>`, {
    onMount(m, close) {
      const calc = () => {
        const f = formData(m), paid = sum(methods, k => num(f[k])), ch = r2(paid - t.total);
        $('#pd', m).textContent = money(paid);
        $('#ch', m).textContent = money(ch); $('#ch', m).className = ch < 0 ? 'bad' : 'good';
        $('#go', m).disabled = ch < -0.001 || num(f.cash) - Math.max(0, ch) < -0.001 && ch > 0;
        return { f, paid, ch };
      };
      m.oninput = calc; calc();
      $$('[data-cash]', m).forEach(b => b.onclick = () => { $('[name=cash]', m).value = b.dataset.cash; calc(); });
      $('[data-x2]', m).onclick = close;
      $('#go', m).onclick = async () => {
        const { f, ch } = calc(); $('#go', m).disabled = true;
        const pay = Object.fromEntries(methods.map(k => [k, r2(num(f[k]))]));
        if (pay.credit && cus && num(cus.creditLimit) > 0 && num(cus.balance) + pay.credit > num(cus.creditLimit)) {
          $('#go', m).disabled = false;
          return toast(`Credit limit exceeded: ${cus.name} owes Rs ${money(cus.balance)}, limit Rs ${money(cus.creditLimit)}`, true);
        }
        const change = Math.max(0, ch);
        const inv = {
          no: nextInvNo(), ts: Date.now(), day: today(), device: device().code,
          customerId: cus?.id || '', customerName: cus?.name || 'Cash', priceType: S.priceType,
          items: S.cart.map(l => ({ code: l.code, name: l.name, qty: l.qty, price: l.price, disc: num(l.disc), cost: num(l.cost) })),
          subtotal: t.sub, discount: t.disc, total: t.total, cost: t.cost, profit: r2(t.total - t.cost),
          pay, change, by: S.me.username, byName: S.me.name, status: 'ok'
        };
        const id = S.db.newId('invoices');
        const ops = [{ op: 'set', col: 'invoices', id, data: inv }];
        for (const l of inv.items) { const p = S.pmap[l.code]; ops.push({ op: 'update', col: 'products', id: l.code, data: { stock: INC(-l.qty) } }); ops.push(move(p, -l.qty, 'sale', inv.no)); }
        if (pay.credit && cus) ops.push({ op: 'update', col: 'customers', id: cus.id, data: { balance: INC(pay.credit) } });
        if (await commit(ops, `Invoice ${inv.no} saved`)) {
          if (f.print) { localStorage.removeItem('cv_noprint'); printReceipt(inv); } else localStorage.setItem('cv_noprint', '1');
          close(); done();
        } else $('#go', m).disabled = false;
      };
    }
  });
}

function printReceipt(inv) {
  const s = shop();
  printHTML(`<div class="c"><h1>${esc(s.name)}</h1>${esc(s.address)}<br>${esc(s.phone)}</div><hr>
  <div>Invoice: <b>${esc(inv.no)}</b><br>${fmtDT(inv.ts)}<br>Customer: ${esc(inv.customerName)}<br>Cashier: ${esc(inv.byName || inv.by)}</div><hr>
  <table style="width:100%"><tr><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Amount</th></tr>
  ${inv.items.map(l => `<tr><td colspan="3">${esc(l.name)}</td></tr><tr><td>@ ${money(l.price)}</td><td style="text-align:center">${qtyf(l.qty)}</td><td style="text-align:right">${money(l.qty * l.price - num(l.disc))}</td></tr>`).join('')}</table><hr>
  <table style="width:100%">${inv.discount ? `<tr><td>Sub total</td><td style="text-align:right">${money(inv.subtotal)}</td></tr><tr><td>Discount</td><td style="text-align:right">-${money(inv.discount)}</td></tr>` : ''}
  <tr><td><b>TOTAL</b></td><td style="text-align:right"><b style="font-size:15px">${money(inv.total)}</b></td></tr>
  ${Object.entries(inv.pay || {}).filter(([, v]) => v).map(([k, v]) => `<tr><td>${k[0].toUpperCase() + k.slice(1)}</td><td style="text-align:right">${money(v)}</td></tr>`).join('')}
  ${inv.change ? `<tr><td>Change</td><td style="text-align:right">${money(inv.change)}</td></tr>` : ''}</table><hr>
  <div class="c">${esc(s.receiptFooter)}<br><small>Items: ${qtyf(sum(inv.items, 'qty'))}</small></div>`, 'receipt');
}

function invoiceModal(inv, id) {
  modal(`Invoice ${esc(inv.no)} ${inv.status === 'void' ? '<span class="tag r">DELETED</span>' : ''}`, `<div class="muted">${fmtDT(inv.ts)} · ${esc(inv.customerName)} · ${esc(inv.byName || inv.by)} · ${esc(inv.priceType)}</div><br>
   ${tableHTML([{ k: 'name', t: 'Item' }, { k: 'qty', t: 'Qty', num: 1 }, { k: 'price', t: 'Price', money: 1 }, { k: 'amt', t: 'Amount', money: 1 }], inv.items.map(l => ({ ...l, amt: l.qty * l.price - num(l.disc) })), { amt: inv.total })}
   <br><div class="row">${Object.entries(inv.pay || {}).filter(([, v]) => v).map(([k, v]) => `<span class="tag">${k}: ${money(v)}</span>`).join('')}${inv.discount ? `<span class="tag a">Disc ${money(inv.discount)}</span>` : ''}${inv.returned ? `<span class="tag r">Returned ${money(inv.returned)}</span>` : ''}</div>
   ${inv.imported ? '<div class="muted" style="margin-top:10px">Bill imported from the old ERP — no item details.</div>' : ''}
   <div class="acts">${isAdmin() && inv.status !== 'void' && !inv.imported ? `<button class="btn d" id="void">${ic('trash')}Delete bill</button>` : ''}<button class="btn p" id="rp">${ic('print')}Print</button></div>`, {
    wide: true,
    onMount(m, close) {
      $('#rp', m).onclick = () => printReceipt(inv);
      const v = $('#void', m);
      if (v) v.onclick = async () => { if (await deleteInvoice({ ...inv, id })) close(); };
    }
  });
}
// Delete a bill: it disappears from sales, every item goes back to stock,
// credit given on the bill is removed from the customer. The record is kept as "deleted" for audit.
async function deleteInvoice(inv, reason) {
  if (inv.status === 'void') { toast('This bill is already deleted', true); return false; }
  if (num(inv.returned) > 0) { toast('Some items on this bill were already returned. Use item return for the rest.', true); return false; }
  const list = inv.items.map(l => `${esc(l.name)} × ${qtyf(l.qty)}`).join('<br>');
  if (!(await confirmBox(`Delete bill <b>${esc(inv.no)}</b> (Rs ${money(inv.total)})?<br><br>These items will be added back to stock:<br>${list || '—'}`, 'Delete bill'))) return false;
  const ops = [{ op: 'update', col: 'invoices', id: inv.id, data: { status: 'void', voidBy: S.me.username, voidTs: Date.now(), voidReason: reason || '' } }];
  for (const l of inv.items) { const p = S.pmap[l.code]; if (!p) continue; ops.push({ op: 'update', col: 'products', id: l.code, data: { stock: INC(l.qty) } }); ops.push(move(p, l.qty, 'bill deleted', inv.no)); }
  if (inv.pay?.credit && inv.customerId) ops.push({ op: 'update', col: 'customers', id: inv.customerId, data: { balance: INC(-inv.pay.credit) } });
  return commit(ops, `Bill ${inv.no} deleted — items added back to stock`);
}
async function findInvoice(no) {
  no = String(no).trim().toUpperCase(); if (!no) return null;
  let hit = S.recent.find(i => String(i.no).toUpperCase() === no);
  if (!hit) { const r = await S.db.where('invoices', 'no', no); hit = r[0]; }
  if (!hit && /^\d+$/.test(no)) { const r = await S.db.where('invoices', 'no', (device().code || 'A') + no); hit = r[0]; }
  return hit || null;
}

// ================================================================ RETURNS
VIEWS.returns = {
  title: () => 'Returns',
  html: () => `<div class="grid g2">
    <div class="card"><h2>Find invoice</h2><div class="row"><input id="ino" placeholder="Invoice no (e.g. A185)" class="grow" style="flex:1"><button class="btn p" id="find">${ic('search')}Find</button></div>
      <div id="inv" style="margin-top:14px"></div></div>
    <div class="card"><h2>Return items</h2><div id="rl"></div>
      <div class="form" style="margin-top:12px"><label class="f">Refund method<select id="rm"><option value="cash">Cash refund</option><option value="credit">Deduct from customer credit</option><option value="exchange">Exchange (no refund)</option></select></label>
      <label class="f">Reason<input id="rr" placeholder="Damage / wrong item…"></label></div>
      <div class="row" style="margin-top:14px"><b class="grow" id="rt">Total: 0.00</b><button class="btn p" id="proc">Process return</button></div></div>
  </div><br><div class="card"><h2>Return a product without an invoice</h2><div class="row"><select id="mp" class="grow" style="flex:1"><option value="">Select product</option>${S.products.map(p => opt(p.code, `${p.code} · ${p.name}`)).join('')}</select><input id="mq" placeholder="Qty" style="width:90px"><input id="mpr" placeholder="Price" style="width:120px"><button class="btn" id="madd">${ic('plus')}Add</button></div></div>`,
  mount(el) {
    let inv = null, invId = '', lines = [];
    const draw = () => {
      $('#rl', el).innerHTML = lines.length ? lines.map((l, i) => `<div class="row" style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06)"><span class="grow">${esc(l.name)}<br><small class="dim">${money(l.price)}${l.max ? ` · max ${l.max}` : ''}</small></span><input data-i="${i}" value="${l.qty}" style="width:80px"><button class="btn sm" data-rm="${i}">${ic('x')}</button></div>`).join('') : '<div class="dim">No items</div>';
      $('#rt', el).textContent = 'Total: ' + money(sum(lines, l => l.qty * l.price));
    };
    draw();
    const find = async () => {
      inv = await findInvoice($('#ino', el).value);
      if (!inv) { $('#inv', el).innerHTML = '<div class="bad">Invoice not found</div>'; return; }
      invId = inv.id;
      // how many of each item were already returned on this bill
      inv._ret = {};
      try { for (const r of await S.db.where('returns', 'invoiceId', inv.id)) for (const l of r.items || []) inv._ret[l.code] = (inv._ret[l.code] || 0) + num(l.qty); } catch (e) {}
      lines = lines.filter(l => !l.inv); draw();
      const left = l => Math.max(0, num(l.qty) - (inv._ret[l.code] || 0));
      const deleted = inv.status === 'void';
      $('#inv', el).innerHTML = `<div class="muted">${fmtDT(inv.ts)} · ${esc(inv.customerName)} · Rs ${money(inv.total)} ${deleted ? '<span class="tag r">DELETED</span>' : ''}</div><br>` +
        inv.items.map((l, i) => `<div class="row" style="padding:6px 0"><span class="grow">${esc(l.name)} × ${qtyf(l.qty)}${inv._ret[l.code] ? ` <span class="tag a">${qtyf(inv._ret[l.code])} returned</span>` : ''}</span>${deleted ? '' : left(l) > 0 ? `<button class="btn sm" data-a="${i}">Return ${ic('returns')}</button>` : '<span class="tag">All returned</span>'}</div>`).join('') +
        (deleted || Object.keys(inv._ret).length ? (deleted ? '' : '<div class="muted" style="margin-top:10px">Some items were already returned, so the whole bill cannot be deleted. Return the remaining items one by one.</div>') + (deleted ? `<div class="bad" style="margin-top:10px">This bill was deleted${inv.voidBy ? ' by ' + esc(inv.voidBy) : ''}${inv.voidTs ? ' on ' + fmtDT(inv.voidTs) : ''}.</div>` : '')
          : `<div class="card" style="margin-top:14px;padding:14px;border-color:rgba(255,93,108,.4)"><b>Whole bill returned?</b><div class="muted" style="margin:4px 0 10px">Delete the bill and add all its items back to stock.</div><button class="btn d" id="delbill">${ic('trash')}Delete bill &amp; return all items</button></div>`);
      const db = $('#delbill', el);
      if (db) db.onclick = async () => { if (await deleteInvoice(inv, $('#rr', el).value)) { $('#ino', el).value = ''; find && setTimeout(() => { $('#inv', el).innerHTML = `<div class="good">Bill ${esc(inv.no)} deleted. Stock updated.</div>`; }, 50); } };
      if (inv.customerId) $('#rm', el).value = num(inv.pay?.credit) ? 'credit' : 'cash';
    };
    $('#find', el).onclick = find; $('#ino', el).onkeydown = e => { if (e.key === 'Enter') find(); };
    $('#inv', el).onclick = e => {
      const b = e.target.closest('[data-a]'); if (!b) return; const l = inv.items[b.dataset.a];
      const ex = lines.find(x => x.code === l.code && x.inv); if (ex) return;
      const unit = l.qty ? (l.qty * l.price - num(l.disc)) / l.qty * (inv.total / (inv.subtotal || inv.total)) : l.price;
      const max = Math.max(0, num(l.qty) - ((inv._ret || {})[l.code] || 0)); if (!max) return toast('This item was already fully returned', true);
      lines.push({ code: l.code, name: l.name, qty: max, max, price: r2(unit), inv: true }); draw();
    };
    $('#mp', el).onchange = e => { const p = S.pmap[e.target.value]; if (p) $('#mpr', el).value = p.retail; };
    $('#madd', el).onclick = () => { const p = S.pmap[$('#mp', el).value]; if (!p) return; lines.push({ code: p.code, name: p.name, qty: num($('#mq', el).value) || 1, price: num($('#mpr', el).value) }); draw(); };
    $('#rl', el).onchange = e => { const i = e.target.dataset.i; if (i !== undefined) { const l = lines[i]; l.qty = Math.min(l.max || 1e9, Math.max(0, num(e.target.value))); setTimeout(draw, 0); } };
    $('#rl', el).onclick = e => { const b = e.target.closest('[data-rm]'); if (b) { lines.splice(b.dataset.rm, 1); draw(); } };
    $('#proc', el).onclick = async () => {
      lines = lines.filter(l => l.qty > 0); if (!lines.length) return toast('No items to return', true);
      const method = $('#rm', el).value, total = r2(sum(lines, l => l.qty * l.price));
      if (method === 'credit' && !inv?.customerId) return toast('A customer is required for a credit return', true);
      const no = 'R' + (device().code || 'A') + Date.now().toString().slice(-6);
      const rec = { no, ts: Date.now(), day: today(), invoiceNo: inv?.no || '', invoiceId: invId, customerId: inv?.customerId || '', customerName: inv?.customerName || 'Cash', items: lines.map(({ code, name, qty, price }) => ({ code, name, qty, price, cost: num(S.pmap[code]?.cost) })), total, cost: r2(sum(lines, l => l.qty * num(S.pmap[l.code]?.cost))), method, reason: $('#rr', el).value, by: S.me.username };
      const ops = [{ op: 'set', col: 'returns', id: S.db.newId('returns'), data: rec }];
      for (const l of lines) { ops.push({ op: 'update', col: 'products', id: l.code, data: { stock: INC(l.qty) } }); ops.push(move(S.pmap[l.code], l.qty, 'return', no)); }
      if (invId) ops.push({ op: 'update', col: 'invoices', id: invId, data: { returned: INC(total) } });
      if (method === 'credit') ops.push({ op: 'update', col: 'customers', id: inv.customerId, data: { balance: INC(-total) } });
      if (await commit(ops, `Return ${no} saved (Rs ${money(total)})`)) route();
    };
  }
};

// ================================================================ STOCK
VIEWS.stock = {
  title: () => 'Stock',
  live: ['products'],
  html: () => `<div class="row" style="margin-bottom:12px"><div class="search grow" style="min-width:220px">${ic('search')}<input id="q" placeholder="Search…"></div>
    <select id="cat" style="width:180px"><option value="">All categories</option>${cats().map(c => opt(c, c)).join('')}</select>
    <select id="flt" style="width:150px"><option value="in">In stock</option><option value="all">All</option><option value="low">Low stock</option><option value="zero">Out of stock</option></select>
    <button class="btn" id="csv">${ic('download')}Excel</button><button class="btn" id="pr">${ic('print')}Print</button>
    ${isAdmin() ? `<a class="btn p" href="#/grn">${ic('plus')}Add stock (GRN)</a>` : ''}</div>
    <div class="grid g4" id="sts" style="margin-bottom:12px"></div>
    <div class="panel"><div class="tbl-wrap" id="tb"></div></div>`,
  mount(el) {
    const st = this._st = this._st || { q: '', cat: '', flt: 'in' };
    $('#q', el).value = st.q; $('#cat', el).value = st.cat; $('#flt', el).value = st.flt;
    const cols = [{ k: 'code', t: 'ID' }, { k: 'name', t: 'Name' }, { k: 'category', t: 'Category' }, ...(isAdmin() ? [{ k: 'cost', t: 'Cost', money: 1 }] : []), { k: 'retail', t: 'Selling', money: 1 }, { k: 'stock', t: 'Qty', num: 1, html: r => `<b class="${num(r.stock) <= 0 ? 'bad' : num(r.stock) <= num(r.reorder) ? 'warn' : ''}">${qtyf(r.stock)}</b> <small class="dim">${esc(r.unit || '')}</small>` }, ...(isAdmin() ? [{ k: 'costVal', t: 'Cost total', money: 1 }] : []), { k: 'sellVal', t: 'Selling total', money: 1 }];
    const rows = () => {
      const s = st.q.toLowerCase();
      return S.products.filter(p => (!st.cat || p.category === st.cat) && (!s || p.name.toLowerCase().includes(s) || p.code.includes(s)) &&
        (st.flt === 'all' || (st.flt === 'in' && num(p.stock) > 0) || (st.flt === 'low' && num(p.stock) <= num(p.reorder) && p.active !== false) || (st.flt === 'zero' && num(p.stock) <= 0)))
        .map(p => ({ ...p, costVal: num(p.stock) * num(p.cost), sellVal: num(p.stock) * num(p.retail) }));
    };
    const draw = () => {
      const r = rows(), foot = { stock: sum(r, 'stock'), costVal: sum(r, 'costVal'), sellVal: sum(r, 'sellVal') };
      $('#sts', el).innerHTML = `<div class="stat card"><div class="k">Items</div><div class="v">${r.length}</div></div><div class="stat card"><div class="k">Total qty</div><div class="v">${qtyf(foot.stock)}</div></div>${isAdmin() ? `<div class="stat card"><div class="k">Cost value</div><div class="v">${money(foot.costVal)}</div></div>` : ''}<div class="stat card"><div class="k">Selling value</div><div class="v">${money(foot.sellVal)}</div></div>`;
      const c2 = isAdmin() ? [...cols, { k: 'a', t: '', html: r => `<div class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn sm" data-adj="${esc(r.code)}" data-s="-1">${ic('minus')}</button><button class="btn sm" data-adj="${esc(r.code)}" data-s="1">${ic('plus')}</button><button class="btn sm" data-lbl="${esc(r.code)}">${ic('barcode')}</button></div>` }] : cols;
      $('#tb', el).innerHTML = tableHTML(c2, r, foot);
    };
    this.refresh = draw; draw();
    $('#q', el).oninput = debounce(e => { st.q = e.target.value; draw(); });
    $('#cat', el).onchange = e => { st.cat = e.target.value; draw(); };
    $('#flt', el).onchange = e => { st.flt = e.target.value; draw(); };
    $('#csv', el).onclick = () => downloadCSV('stock-' + today(), cols, rows());
    $('#pr', el).onclick = () => { const r = rows(); printTable('Stock', `${st.cat || 'All categories'} · ${today()}`, cols, r, { stock: sum(r, 'stock'), costVal: sum(r, 'costVal'), sellVal: sum(r, 'sellVal') }); };
    $('#tb', el).onclick = e => {
      const a = e.target.closest('[data-adj]'), l = e.target.closest('[data-lbl]');
      if (a) adjustModal(S.pmap[a.dataset.adj], num(a.dataset.s));
      if (l) labelModal([{ ...S.pmap[l.dataset.lbl], qty: Math.max(1, num(S.pmap[l.dataset.lbl].stock)) }]);
    };
  }
};
function adjustModal(p, sign) {
  modal(`${sign > 0 ? 'Plus (+)' : 'Minus (−)'} stock — ${esc(p.name)}`, `<div class="muted">Current stock: <b>${qtyf(p.stock)}</b></div><br><div class="form"><label class="f">Qty<input name="qty" inputmode="decimal"></label><label class="f">Reason<select name="reason">${(sign > 0 ? ['Found', 'Correction', 'Opening stock'] : ['Damage', 'Expired', 'Lost', 'Own use', 'Free issue', 'Correction']).map(x => opt(x, x)).join('')}</select></label><label class="f full">Note<input name="note"></label></div><div class="acts"><button class="btn p" id="ok">Save</button></div>`, {
    onMount(m, close) {
      $('#ok', m).onclick = async () => {
        const f = formData(m), q = num(f.qty) * sign; if (!q) return toast('Enter a quantity', true);
        const ops = [{ op: 'update', col: 'products', id: p.code, data: { stock: INC(q) } }, move(p, q, 'adjust', f.reason),
          { op: 'set', col: 'adjustments', id: S.db.newId('adjustments'), data: { ts: Date.now(), day: today(), code: p.code, name: p.name, qty: q, before: num(p.stock), cost: num(p.cost), reason: f.reason, note: f.note, by: S.me.username } }];
        if (await commit(ops, 'Stock updated')) close();
      };
    }
  });
}

// ---------------------------------------------------------------- barcode labels
let jsb;
function loadJsBarcode() {
  if (window.JsBarcode) return Promise.resolve();
  return jsb = jsb || new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}
function labelModal(items) {
  modal('Barcode labels', `<div class="dim" style="margin-bottom:10px">Label size 48×28mm. You can change the quantity.</div>${items.map((p, i) => `<div class="row" style="padding:5px 0"><span class="grow">${esc(p.name)}</span><input data-i="${i}" value="${p.qty || 1}" style="width:80px"></div>`).join('')}
   <label class="row" style="gap:8px;margin-top:10px"><input type="checkbox" id="pp" checked> Print price</label><div class="acts"><button class="btn p" id="go">${ic('print')}Print</button></div>`, {
    onMount(m, close) {
      $('#go', m).onclick = async () => {
        try { await loadJsBarcode(); } catch (e) { return toast('Barcode library failed to load (internet needed the first time)', true); }
        const showP = $('#pp', m).checked; let html = '<div class="labels">';
        items.forEach((p, i) => { const n = Math.min(500, num($(`[data-i="${i}"]`, m).value)); for (let k = 0; k < n; k++) html += `<div class="label"><b>${esc(shop().name)}</b><div>${esc(p.name)}</div><svg class="bc" data-v="${esc(p.barcode || p.code)}"></svg>${showP ? `<b>Rs ${money(p.retail)}</b>` : ''}</div>`; });
        const pEl = $('#print'); pEl.className = 'rep'; pEl.innerHTML = html + '</div>';
        $$('.bc', pEl).forEach(s => window.JsBarcode(s, s.dataset.v, { format: 'CODE128', displayValue: true, fontSize: 12, height: 40, margin: 0 }));
        close(); setTimeout(() => window.print(), 80);
      };
    }
  });
}

// ================================================================ GRN
VIEWS.grn = {
  title: () => 'GRN — Goods Received',
  live: ['products', 'suppliers'],
  html: () => `<div class="grid g2" style="grid-template-columns:1.3fr 1fr">
    <div class="panel"><div style="padding:16px 18px;border-bottom:1px solid var(--line)" class="row"><h2 class="grow" style="margin:0">GRN Total: <span id="gt">0.00</span></h2><span class="tag" id="gc">0 items</span></div><div class="tbl-wrap" id="gl" style="max-height:52vh"></div>
      <div style="padding:16px" class="form"><label class="f">Supplier<select id="sup"><option value="">— Select —</option>${S.suppliers.filter(s => s.active !== false).map(s => opt(s.id, s.name)).join('')}</select></label>
      <label class="f">Supplier invoice / ref<input id="ref"></label><label class="f">Paid now<input id="paid" inputmode="decimal" placeholder="0.00"></label><label class="f">Paid by<select id="pm"><option>cash</option><option>transfer</option><option>cheque</option><option>card</option></select></label></div>
      <div style="padding:0 16px 16px" class="row"><button class="btn" id="nsup">${ic('plus')}New supplier</button><button class="btn" id="pend">Pending <span class="tag" id="pc">0</span></button><span class="grow"></span><button class="btn d" id="rst">Reset</button><button class="btn p lg" id="proc">Process GRN</button></div></div>
    <div class="card"><h2>Add item</h2>
      <div class="search">${ic('search')}<input id="pq" list="plist" placeholder="Code / name / barcode"></div><datalist id="plist">${S.products.map(p => `<option value="${esc(p.code)}">${esc(p.name)}</option>`).join('')}</datalist>
      <div id="pinfo" class="muted" style="margin:8px 0"></div>
      <div class="form"><label class="f">Quantity<input id="q" inputmode="decimal"></label><label class="f">Unit cost<input id="c" inputmode="decimal"></label>
      <label class="f">Total cost (optional)<input id="tc" inputmode="decimal"></label><label class="f">MRP<input id="mrp" inputmode="decimal"></label>
      <label class="f">Retail<input id="ret" inputmode="decimal"></label><label class="f">Loyalty<input id="loy" inputmode="decimal"></label>
      <label class="f">Wholesale<input id="wh" inputmode="decimal"></label><label class="f">Batch<input id="bt"></label><label class="f">Expiry<input id="ex" type="date"></label></div>
      <div class="row" style="margin-top:14px"><button class="btn" id="np">${ic('plus')}New product</button><span class="grow"></span><button class="btn p" id="add">Add to table</button></div></div>
  </div>`,
  mount(el) {
    const save = () => localStorage.setItem('cv_grn', JSON.stringify(g));
    let g; try { g = JSON.parse(localStorage.getItem('cv_grn') || 'null'); } catch (e) {} g = g || { lines: [], sup: '', ref: '' };
    $('#sup', el).value = g.sup; $('#ref', el).value = g.ref;
    let sel = null;
    const draw = () => {
      const t = sum(g.lines, l => l.qty * l.cost);
      $('#gt', el).textContent = money(t); $('#gc', el).textContent = g.lines.length + ' items';
      $('#gl', el).innerHTML = tableHTML([{ k: 'name', t: 'Item' }, { k: 'qty', t: 'Qty', num: 1 }, { k: 'cost', t: 'Cost', money: 1 }, { k: 'retail', t: 'Retail', money: 1 }, { k: 'exp', t: 'Exp' }, { k: 'tot', t: 'Total', money: 1 }, { k: 'x', t: '', html: r => `<button class="btn sm" data-rm="${r.i}">${ic('x')}</button>` }], g.lines.map((l, i) => ({ ...l, i, tot: l.qty * l.cost })));
      $('#pc', el).textContent = pendingGrns().length; save();
    };
    draw();
    const pick = () => {
      const v = $('#pq', el).value.trim(); sel = S.pmap[v] || S.products.find(p => p.barcode === v || p.name.toLowerCase() === v.toLowerCase());
      if (!sel) { $('#pinfo', el).textContent = v ? 'Product not found — click "New product"' : ''; return; }
      $('#pinfo', el).innerHTML = `<b style="color:var(--ink)">${esc(sel.name)}</b> · stock ${qtyf(sel.stock)} · cost ${money(sel.cost)}`;
      $('#c', el).value = sel.cost || ''; $('#mrp', el).value = sel.mrp || ''; $('#ret', el).value = sel.retail || ''; $('#loy', el).value = sel.loyalty || ''; $('#wh', el).value = sel.wholesale || '';
      $('#q', el).focus();
    };
    $('#pq', el).onchange = pick; $('#pq', el).onkeydown = e => { if (e.key === 'Enter') pick(); };
    $('#tc', el).oninput = () => { const q = num($('#q', el).value); if (q) $('#c', el).value = r2(num($('#tc', el).value) / q); };
    $('#add', el).onclick = () => {
      if (!sel) return toast('Select a product', true);
      const q = num($('#q', el).value); if (!q) return toast('Enter a quantity', true);
      g.lines.push({ code: sel.code, name: sel.name, qty: q, cost: num($('#c', el).value), mrp: num($('#mrp', el).value), retail: num($('#ret', el).value), loyalty: num($('#loy', el).value), wholesale: num($('#wh', el).value), batch: $('#bt', el).value, exp: $('#ex', el).value });
      $$('.card input', el).forEach(i => i.value = ''); $('#pinfo', el).textContent = ''; sel = null; draw(); $('#pq', el).focus();
    };
    $('#gl', el).onclick = e => { const b = e.target.closest('[data-rm]'); if (b) { g.lines.splice(b.dataset.rm, 1); draw(); } };
    $('#sup', el).onchange = e => { g.sup = e.target.value; save(); };
    $('#ref', el).oninput = e => { g.ref = e.target.value; save(); };
    $('#rst', el).onclick = async () => { if (g.lines.length && !(await confirmBox('Clear this GRN?'))) return; g = { lines: [], sup: '', ref: '' }; save(); route(); };
    $('#np', el).onclick = () => productModal(null, code => { setTimeout(() => { $('#pq', el).value = code; pick(); }, 300); });
    $('#nsup', el).onclick = () => supplierModal(null);
    $('#pend', el).onclick = () => {
      const p = pendingGrns();
      if (!g.lines.length && !p.length) return toast('No pending GRNs');
      modal('Pending GRNs', `${g.lines.length ? `<button class="btn" id="park">Park the current GRN</button><br><br>` : ''}${p.map((x, i) => `<div class="row" style="padding:6px 0"><span class="grow">${fmtDT(x.ts)} · ${esc(S.smap[x.sup]?.name || '-')} · ${x.lines.length} items</span><button class="btn sm p" data-o="${i}">Open</button><button class="btn sm d" data-d="${i}">${ic('trash')}</button></div>`).join('')}`, {
        onMount(m, close) {
          const pk = $('#park', m); if (pk) pk.onclick = () => { p.push({ ...g, ts: Date.now() }); localStorage.setItem('cv_grn_p', JSON.stringify(p)); g = { lines: [], sup: '', ref: '' }; save(); close(); route(); };
          m.onclick = e => { const o = e.target.closest('[data-o]'), d = e.target.closest('[data-d]'); if (o) { g = p.splice(o.dataset.o, 1)[0]; localStorage.setItem('cv_grn_p', JSON.stringify(p)); save(); close(); route(); } if (d) { p.splice(d.dataset.d, 1); localStorage.setItem('cv_grn_p', JSON.stringify(p)); close(); draw(); } };
        }
      });
    };
    $('#proc', el).onclick = async () => {
      if (!g.lines.length) return toast('No items', true);
      const sup = S.smap[$('#sup', el).value]; if (!sup) return toast('Select a supplier', true);
      const total = r2(sum(g.lines, l => l.qty * l.cost)), paid = r2(num($('#paid', el).value));
      if (!(await confirmBox(`Process this GRN?<br><b>${esc(sup.name)}</b> · Rs ${money(total)} · paid ${money(paid)}`, 'Process'))) return;
      const no = 'G' + Date.now().toString().slice(-7);
      const ops = [{ op: 'set', col: 'grns', id: S.db.newId('grns'), data: { no, ts: Date.now(), day: today(), supplierId: sup.id, supplierName: sup.name, ref: g.ref, items: g.lines, total, paid, method: $('#pm', el).value, by: S.me.username } }];
      const agg = {};
      for (const l of g.lines) { (agg[l.code] = agg[l.code] || []).push(l); }
      for (const [code, ls] of Object.entries(agg)) {
        const p = S.pmap[code], q = sum(ls, 'qty'), oldQ = Math.max(0, num(p.stock));
        const newCost = r2((oldQ * num(p.cost) + sum(ls, l => l.qty * l.cost)) / (oldQ + q || 1));
        const last = ls[ls.length - 1];
        const upd = { stock: INC(q), cost: newCost, lastCost: last.cost, lastSupplier: sup.name };
        ['mrp', 'retail', 'loyalty', 'wholesale'].forEach(k => { if (last[k]) upd[k] = last[k]; });
        ops.push({ op: 'update', col: 'products', id: code, data: upd });
        ops.push(move(p, q, 'grn', no));
      }
      ops.push({ op: 'update', col: 'suppliers', id: sup.id, data: { balance: INC(total - paid) } });
      if (paid) ops.push({ op: 'set', col: 'payments', id: S.db.newId('payments'), data: { ts: Date.now(), day: today(), party: 'supplier', partyId: sup.id, partyName: sup.name, amount: paid, method: $('#pm', el).value, note: 'GRN ' + no, by: S.me.username } });
      if (await commit(ops, `GRN ${no} saved`)) {
        const lines = g.lines; g = { lines: [], sup: '', ref: '' }; save();
        if (await confirmBox('Print barcode labels?')) labelModal(lines.map(l => ({ ...S.pmap[l.code], retail: l.retail || S.pmap[l.code].retail, qty: l.qty })));
        route();
      }
    };
  }
};
const pendingGrns = () => { try { return JSON.parse(localStorage.getItem('cv_grn_p') || '[]'); } catch (e) { return []; } };

// ================================================================ VERIFY
VIEWS.verify = {
  title: () => 'Stock Verify',
  html: () => `<div class="card" style="margin-bottom:12px"><div class="row"><select id="cat" style="width:200px"><option value="">All categories</option>${cats().map(c => opt(c, c)).join('')}</select><label class="row" style="gap:6px"><input type="checkbox" id="onlyin"> In-stock items only</label><span class="grow"></span><span class="muted">Enter the counted quantity in "Counted". Blank rows are not changed.</span></div></div>
   <div class="panel"><div class="tbl-wrap" id="tb"></div></div>
   <div class="row" style="margin-top:14px"><b class="grow" id="sm"></b><button class="btn p lg" id="ap">Apply differences</button></div>`,
  mount(el) {
    const counted = {};
    const rows = () => S.products.filter(p => p.active !== false && (!$('#cat', el).value || p.category === $('#cat', el).value) && (!$('#onlyin', el).checked || num(p.stock) > 0));
    const draw = () => {
      $('#tb', el).innerHTML = tableHTML([{ k: 'code', t: 'ID' }, { k: 'name', t: 'Name' }, { k: 'stock', t: 'System', num: 1 }, { k: 'c', t: 'Counted', html: r => `<input data-c="${esc(r.code)}" value="${counted[r.code] ?? ''}" style="width:90px;padding:6px" inputmode="decimal">` }, { k: 'd', t: 'Diff', html: r => { const c = counted[r.code]; if (c === undefined || c === '') return ''; const d = num(c) - num(r.stock); return `<b class="${d < 0 ? 'bad' : d > 0 ? 'good' : 'dim'}">${d > 0 ? '+' : ''}${qtyf(d)}</b>`; } }], rows());
      const diffs = Object.entries(counted).filter(([k, v]) => v !== '' && S.pmap[k] && num(v) !== num(S.pmap[k].stock));
      $('#sm', el).textContent = `${diffs.length} differences · value ${money(sum(diffs, ([k, v]) => (num(v) - num(S.pmap[k].stock)) * num(S.pmap[k].cost)))}`;
    };
    draw();
    $('#cat', el).onchange = draw; $('#onlyin', el).onchange = draw;
    $('#tb', el).onchange = e => { const c = e.target.dataset.c; if (c) { counted[c] = e.target.value; setTimeout(() => { draw(); const n = $(`[data-c="${CSS.escape(c)}"]`, el)?.closest('tr')?.nextElementSibling?.querySelector('input'); n && n.focus(); }, 0); } };
    $('#ap', el).onclick = async () => {
      const diffs = Object.entries(counted).filter(([k, v]) => v !== '' && S.pmap[k] && num(v) !== num(S.pmap[k].stock));
      if (!diffs.length) return toast('No differences');
      if (!(await confirmBox(`Update stock for ${diffs.length} items?`, 'Apply'))) return;
      const ops = [];
      for (const [code, v] of diffs) {
        const p = S.pmap[code], d = r2(num(v) - num(p.stock));
        ops.push({ op: 'update', col: 'products', id: code, data: { stock: INC(d), verified: Date.now() } }, move(p, d, 'verify', 'Stock verify'),
          { op: 'set', col: 'adjustments', id: S.db.newId('adjustments'), data: { ts: Date.now(), day: today(), code, name: p.name, qty: d, before: num(p.stock), cost: num(p.cost), reason: 'Stock verify', note: `Counted ${v}`, by: S.me.username } });
      }
      if (await commit(ops, 'Stock verification complete')) route();
    };
  }
};

// ================================================================ PRODUCTS
VIEWS.products = {
  title: () => 'Products',
  live: ['products'],
  html: () => `<div class="row" style="margin-bottom:12px"><div class="search grow" style="min-width:220px">${ic('search')}<input id="q" placeholder="Search…"></div><select id="cat" style="width:180px"><option value="">All categories</option>${cats().map(c => opt(c, c)).join('')}</select>
    <button class="btn" id="cats">Categories</button><button class="btn" id="csv">${ic('download')}Excel</button><button class="btn p" id="new">${ic('plus')}New product</button></div>
    <div class="panel"><div class="tbl-wrap" id="tb"></div></div>`,
  mount(el) {
    const cols = [{ k: 'code', t: 'ID' }, { k: 'name', t: 'Name', html: r => `${esc(r.name)} ${r.active === false ? '<span class="tag r">Inactive</span>' : ''}` }, { k: 'category', t: 'Category' }, { k: 'cost', t: 'Cost', money: 1 }, { k: 'mrp', t: 'MRP', money: 1 }, { k: 'retail', t: 'Retail', money: 1 }, { k: 'loyalty', t: 'Loyalty', money: 1 }, { k: 'wholesale', t: 'Wholesale', money: 1 }, { k: 'stock', t: 'Stock', num: 1 }, { k: 'reorder', t: 'Reorder', num: 1 }];
    const rows = () => { const s = $('#q', el).value.toLowerCase(), c = $('#cat', el).value; return S.products.filter(p => (!c || p.category === c) && (!s || p.name.toLowerCase().includes(s) || p.code.includes(s) || (p.barcode || '').includes(s))); };
    const draw = () => $('#tb', el).innerHTML = tableHTML([...cols, { k: 'x', t: '', html: r => `<div class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn sm" data-e="${esc(r.code)}">${ic('edit')}</button><button class="btn sm" data-h="${esc(r.code)}">${ic('clock')}</button><button class="btn sm" data-l="${esc(r.code)}">${ic('barcode')}</button></div>` }], rows());
    this.refresh = draw; draw();
    $('#q', el).oninput = debounce(draw); $('#cat', el).onchange = draw;
    $('#new', el).onclick = () => productModal(null);
    $('#csv', el).onclick = () => downloadCSV('products-' + today(), cols, rows());
    $('#cats', el).onclick = () => listEditor('Product categories', cats(), list => commit([{ op: 'set', col: 'meta', id: 'settings', merge: true, data: { categories: list } }], 'Saved'));
    $('#tb', el).onclick = e => {
      const ed = e.target.closest('[data-e]'), h = e.target.closest('[data-h]'), l = e.target.closest('[data-l]');
      if (ed) productModal(S.pmap[ed.dataset.e]);
      if (l) labelModal([{ ...S.pmap[l.dataset.l], qty: 1 }]);
      if (h) productHistory(S.pmap[h.dataset.h]);
    };
  }
};
function nextCode() { const n = Math.max(0, ...S.products.map(p => parseInt(p.code, 10)).filter(isFinite)); return pad(n + 1, 5); }
function productModal(p, done) {
  const isNew = !p; p = p || { code: nextCode(), unit: 'Nos', reorder: 1, category: cats()[0], active: true };
  modal(isNew ? 'New product' : 'Edit — ' + esc(p.name), `<div class="form">
    <label class="f">Product ID<input name="code" value="${esc(p.code)}" ${isNew ? '' : 'readonly'}></label><label class="f">Barcode (optional)<input name="barcode" value="${esc(p.barcode || '')}"></label>
    <label class="f full">Name<input name="name" value="${esc(p.name || '')}"></label>
    <label class="f">Category<select name="category">${cats().map(c => opt(c, c, p.category)).join('')}</select></label>
    <label class="f">Unit<select name="unit">${['Nos', 'Item', 'Pack', 'ml', 'L', 'g', 'Kg', 'Bags', 'Box'].map(u => opt(u, u, p.unit)).join('')}</select></label>
    <label class="f">Cost<input name="cost" value="${p.cost ?? ''}" inputmode="decimal"></label><label class="f">MRP<input name="mrp" value="${p.mrp ?? ''}" inputmode="decimal"></label>
    <label class="f">Retail price<input name="retail" value="${p.retail ?? ''}" inputmode="decimal"></label><label class="f">Loyalty price<input name="loyalty" value="${p.loyalty ?? ''}" inputmode="decimal"></label>
    <label class="f">Wholesale price<input name="wholesale" value="${p.wholesale ?? ''}" inputmode="decimal"></label><label class="f">Reorder level<input name="reorder" value="${p.reorder ?? 1}" inputmode="decimal"></label>
    ${isNew ? `<label class="f">Opening stock<input name="stock" value="0" inputmode="decimal"></label>` : ''}
    <label class="f row" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="active" ${p.active !== false ? 'checked' : ''}> Active</label>
    <div class="full muted" id="mg"></div></div>
    <div class="acts"><button class="btn p" id="sv">Save</button></div>`, {
    onMount(m, close) {
      const mg = () => { const f = formData(m), c = num(f.cost), r = num(f.retail); $('#mg', m).textContent = c && r ? `Profit: Rs ${money(r - c)} (${((r - c) / c * 100).toFixed(1)}%)` : ''; };
      m.oninput = mg; mg();
      $('[name=retail]', m).onchange = e => { ['loyalty', 'wholesale', 'mrp'].forEach(k => { const i = $(`[name=${k}]`, m); if (!i.value) i.value = e.target.value; }); };
      $('#sv', m).onclick = async () => {
        const f = formData(m); f.code = f.code.trim();
        if (!f.code || !f.name.trim()) return toast('ID and name are required', true);
        if (isNew && S.pmap[f.code]) return toast('This ID already exists', true);
        const data = { code: f.code, barcode: f.barcode.trim(), name: f.name.trim(), category: f.category, unit: f.unit, cost: num(f.cost), mrp: num(f.mrp), retail: num(f.retail), loyalty: num(f.loyalty) || num(f.retail), wholesale: num(f.wholesale) || num(f.retail), reorder: num(f.reorder), active: f.active, updated: Date.now() };
        const ops = [];
        if (isNew) { data.stock = num(f.stock); data.ts = Date.now(); ops.push({ op: 'set', col: 'products', id: f.code, data }); if (data.stock) ops.push(move({ ...data, stock: 0 }, data.stock, 'opening', 'New product')); }
        else ops.push({ op: 'update', col: 'products', id: f.code, data });
        if (await commit(ops, 'Product saved')) { close(); done && done(f.code); }
      };
    }
  });
}
async function productHistory(p) {
  const moves = (await S.db.where('stockMoves', 'code', p.code)).sort(by('ts', true)).slice(0, 200);
  modal('Stock movement — ' + esc(p.name), tableHTML([{ k: 'dt', t: 'Date' }, { k: 'type', t: 'Type' }, { k: 'ref', t: 'Ref' }, { k: 'before', t: 'Before', num: 1 }, { k: 'qty', t: 'Qty', num: 1 }, { k: 'after', t: 'After', num: 1 }, { k: 'by', t: 'By' }], moves.map(m => ({ ...m, dt: fmtDT(m.ts), after: num(m.before) + num(m.qty) }))), { wide: true });
}
function listEditor(title, list, onSave) {
  modal(title, `<div id="li"></div><div class="row" style="margin-top:10px"><input id="nv" placeholder="New item" class="grow" style="flex:1"><button class="btn" id="ad">${ic('plus')}Add</button></div><div class="acts"><button class="btn p" id="sv">Save</button></div>`, {
    onMount(m, close) {
      list = [...list];
      const d = () => $('#li', m).innerHTML = list.map((x, i) => `<div class="row" style="padding:5px 0"><span class="grow">${esc(x)}</span><button class="btn sm" data-d="${i}">${ic('x')}</button></div>`).join('');
      d();
      $('#ad', m).onclick = () => { const v = $('#nv', m).value.trim(); if (v && !list.includes(v)) { list.push(v); $('#nv', m).value = ''; d(); } };
      $('#li', m).onclick = e => { const b = e.target.closest('[data-d]'); if (b) { list.splice(b.dataset.d, 1); d(); } };
      $('#sv', m).onclick = async () => { await onSave(list); close(); route(); };
    }
  });
}

// ================================================================ CUSTOMERS
VIEWS.customers = {
  title: () => 'Customers',
  live: ['customers'],
  html: () => `<div class="row" style="margin-bottom:12px"><div class="search grow" style="min-width:220px">${ic('search')}<input id="q" placeholder="Name / phone / NIC"></div><select id="f" style="width:170px"><option value="all">All customers</option><option value="credit">Credit customers</option><option value="Company">Company</option><option value="Individual">Individual</option></select><button class="btn" id="csv">${ic('download')}Excel</button><button class="btn p" id="new">${ic('plus')}New customer</button></div>
   <div class="grid g3" id="st" style="margin-bottom:12px"></div><div class="panel"><div class="tbl-wrap" id="tb"></div></div>`,
  mount(el) {
    const cols = [{ k: 'name', t: 'Name' }, { k: 'phone', t: 'Telephone' }, { k: 'nic', t: 'NIC / BR' }, { k: 'type', t: 'Type' }, { k: 'address', t: 'Address' }, { k: 'balance', t: 'Balance', money: 1 }];
    const rows = () => { const s = $('#q', el).value.toLowerCase(), f = $('#f', el).value; return S.customers.filter(c => (f === 'all' || (f === 'credit' ? num(c.balance) > 0 : c.type === f)) && (!s || [c.name, c.phone, c.nic].join(' ').toLowerCase().includes(s))); };
    const draw = () => {
      const r = rows();
      $('#st', el).innerHTML = `<div class="stat card"><div class="k">Customers</div><div class="v">${r.length}</div></div><div class="stat card"><div class="k">Credit customers</div><div class="v">${r.filter(c => num(c.balance) > 0).length}</div></div><div class="stat card"><div class="k">Total due</div><div class="v warn">${money(sum(r, 'balance'))}</div></div>`;
      $('#tb', el).innerHTML = tableHTML([...cols, { k: 'x', t: '', html: c => `<div class="row" style="gap:4px;flex-wrap:nowrap">${num(c.balance) > 0 ? `<button class="btn sm p" data-p="${c.id}">Receive</button>` : ''}<button class="btn sm" data-h="${c.id}">${ic('clock')}</button><button class="btn sm" data-e="${c.id}">${ic('edit')}</button></div>` }], r, { balance: sum(r, 'balance') });
    };
    this.refresh = draw; draw();
    $('#q', el).oninput = debounce(draw); $('#f', el).onchange = draw;
    $('#new', el).onclick = () => customerModal(null);
    $('#csv', el).onclick = () => downloadCSV('customers', cols, rows());
    $('#tb', el).onclick = e => {
      const p = e.target.closest('[data-p]'), h = e.target.closest('[data-h]'), ed = e.target.closest('[data-e]');
      if (p) paymentModal('customer', S.cmap[p.dataset.p]);
      if (h) partyHistory('customer', S.cmap[h.dataset.h]);
      if (ed) customerModal(S.cmap[ed.dataset.e]);
    };
  }
};
function customerModal(c, done) {
  const isNew = !c; c = c || { type: 'Individual', priceType: 'retail' };
  modal(isNew ? 'New customer' : 'Edit customer', `<div class="form">
    <label class="f full">Name<input name="name" value="${esc(c.name || '')}"></label><label class="f">Telephone<input name="phone" value="${esc(c.phone || '')}" inputmode="tel"></label><label class="f">NIC / BR<input name="nic" value="${esc(c.nic || '')}"></label>
    <label class="f full">Address<input name="address" value="${esc(c.address || '')}"></label>
    <label class="f">Type<select name="type">${['Individual', 'Company'].map(x => opt(x, x, c.type)).join('')}</select></label><label class="f">Price type<select name="priceType">${[['retail', 'Retail'], ['wholesale', 'Wholesale'], ['loyalty', 'Loyalty']].map(([k, t]) => opt(k, t, c.priceType)).join('')}</select></label>
    <label class="f">Credit limit<input name="creditLimit" value="${c.creditLimit || ''}" inputmode="decimal"></label><label class="f">Pay date<input name="payDate" type="date" value="${esc(c.payDate || '')}"></label>
    ${isNew ? `<label class="f">Opening balance (receivable)<input name="balance" inputmode="decimal" placeholder="0.00"></label>` : ''}
    ${!isNew && isAdmin() ? `<label class="f row" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="active" ${c.active !== false ? 'checked' : ''}> Active</label>` : ''}</div>
    <div class="acts"><button class="btn p" id="sv">Save</button></div>`, {
    onMount(m, close) {
      $('#sv', m).onclick = async () => {
        const f = formData(m); if (!f.name.trim()) return toast('Name is required', true);
        if (f.phone && S.customers.some(x => x.phone === f.phone && x.id !== c.id)) toast('Another customer already has this phone number', true);
        const id = c.id || S.db.newId('customers');
        const data = { name: f.name.trim(), phone: f.phone.trim(), nic: f.nic.trim(), address: f.address, type: f.type, priceType: f.priceType, creditLimit: num(f.creditLimit), payDate: f.payDate, updated: Date.now() };
        if (isNew) Object.assign(data, { balance: num(f.balance), ts: Date.now(), active: true }); else if ('active' in f) data.active = f.active;
        if (await commit([{ op: isNew ? 'set' : 'update', col: 'customers', id, data }], 'Customer saved')) { close(); done && done(id); }
      };
    }
  });
}
function paymentModal(party, x) {
  const isC = party === 'customer';
  modal(`${isC ? 'Receive payment from' : 'Pay to'} ${esc(x.name)}`, `<div class="muted">Balance: <b style="color:var(--ink)">Rs ${money(x.balance)}</b></div><br><div class="form"><label class="f">Amount<input name="amount" value="${num(x.balance) > 0 ? x.balance : ''}" inputmode="decimal"></label><label class="f">Method<select name="method">${['cash', 'transfer', 'cheque', 'card', 'deposit'].map(k => opt(k, k)).join('')}</select></label><label class="f full">Note / cheque no<input name="note"></label></div><div class="acts"><button class="btn p" id="sv">Save</button></div>`, {
    onMount(m, close) {
      $('#sv', m).onclick = async () => {
        const f = formData(m), a = r2(num(f.amount)); if (!a) return toast('Enter an amount', true);
        const ops = [{ op: 'update', col: isC ? 'customers' : 'suppliers', id: x.id, data: { balance: INC(-a) } },
          { op: 'set', col: 'payments', id: S.db.newId('payments'), data: { ts: Date.now(), day: today(), party, partyId: x.id, partyName: x.name, amount: a, method: f.method, note: f.note, by: S.me.username } }];
        if (await commit(ops, 'Payment saved')) {
          close();
          if (isC && await confirmBox('Print receipt?')) { const s = shop(); printHTML(`<div class="c"><h1>${esc(s.name)}</h1>${esc(s.phone)}</div><hr><div class="c"><b>PAYMENT RECEIPT</b></div><br>${fmtDT(Date.now())}<br>Received from: ${esc(x.name)}<br>Amount: <b>Rs ${money(a)}</b><br>Method: ${esc(f.method)} ${esc(f.note)}<br>Balance: Rs ${money(num(x.balance) - a)}<hr><div class="c">${esc(s.receiptFooter)}</div>`, 'receipt'); }
        }
      };
    }
  });
}
async function partyHistory(party, x) {
  const isC = party === 'customer';
  const [docs, pays] = await Promise.all([S.db.where(isC ? 'invoices' : 'grns', isC ? 'customerId' : 'supplierId', x.id), S.db.where('payments', 'partyId', x.id)]);
  const rows = [...docs.map(d => ({ ts: d.ts, ref: d.no, desc: isC ? `Invoice${d.status === 'void' ? ' (void)' : ''}` : 'GRN', debit: isC ? num(d.pay?.credit) : 0, credit: isC ? 0 : num(d.total) - num(d.paid), amt: d.total, _inv: isC ? d : null })),
    ...pays.map(p => ({ ts: p.ts, ref: p.method, desc: 'Payment ' + (p.note || ''), debit: isC ? 0 : 0, credit: 0, paid: p.amount }))].sort(by('ts', true));
  modal(`${esc(x.name)} — history`, `<div class="row" style="margin-bottom:10px"><span class="tag">Phone ${esc(x.phone || '-')}</span><span class="tag a">Balance Rs ${money(x.balance)}</span></div>` +
    tableHTML([{ k: 'dt', t: 'Date' }, { k: 'desc', t: 'Description' }, { k: 'ref', t: 'Ref' }, { k: 'amt', t: isC ? 'Bill total' : 'GRN total', money: 1 }, { k: isC ? 'debit' : 'credit', t: isC ? 'On credit' : 'Unpaid', money: 1 }, { k: 'paid', t: 'Paid', money: 1 }], rows.map(r => ({ ...r, dt: fmtDT(r.ts) }))), { wide: true });
}

// ================================================================ SUPPLIERS
VIEWS.suppliers = {
  title: () => 'Suppliers',
  live: ['suppliers'],
  html: () => `<div class="row" style="margin-bottom:12px"><div class="search grow">${ic('search')}<input id="q" placeholder="Search…"></div><select id="f" style="width:160px"><option value="active">Active</option><option value="all">All</option><option value="due">Outstanding</option></select><button class="btn p" id="new">${ic('plus')}Add supplier</button></div>
    <div class="grid g3" id="st" style="margin-bottom:12px"></div><div class="panel"><div class="tbl-wrap" id="tb"></div></div>`,
  mount(el) {
    const draw = () => {
      const s = $('#q', el).value.toLowerCase(), f = $('#f', el).value;
      const r = S.suppliers.filter(x => (f === 'all' || (f === 'due' ? num(x.balance) > 0 : x.active !== false)) && (!s || [x.name, x.phone].join(' ').toLowerCase().includes(s)));
      const overdue = r.filter(x => num(x.balance) > 0 && x.payDate && x.payDate <= today());
      $('#st', el).innerHTML = `<div class="stat card"><div class="k">Suppliers</div><div class="v">${r.length}</div></div><div class="stat card"><div class="k">Total outstanding</div><div class="v bad">${money(sum(r, 'balance'))}</div></div><div class="stat card"><div class="k">Missed pay dates</div><div class="v ${overdue.length ? 'warn' : ''}">${overdue.length}</div></div>`;
      $('#tb', el).innerHTML = tableHTML([{ k: 'name', t: 'Supplier', html: x => `${esc(x.name)} ${x.active === false ? '<span class="tag r">Inactive</span>' : ''}` }, { k: 'phone', t: 'Telephone' }, { k: 'accNo', t: 'Acc no' }, { k: 'address', t: 'Address' }, { k: 'payDate', t: 'Pay date', html: x => `<span class="${num(x.balance) > 0 && x.payDate && x.payDate <= today() ? 'warn' : ''}">${esc(x.payDate || '')}</span>` }, { k: 'balance', t: 'Balance', money: 1 },
        { k: 'x', t: '', html: x => `<div class="row" style="gap:4px;flex-wrap:nowrap">${num(x.balance) > 0 ? `<button class="btn sm p" data-p="${x.id}">Pay</button>` : ''}<button class="btn sm" data-h="${x.id}">${ic('clock')}</button><button class="btn sm" data-e="${x.id}">${ic('edit')}</button></div>` }], r, { balance: sum(r, 'balance') });
    };
    this.refresh = draw; draw();
    $('#q', el).oninput = debounce(draw); $('#f', el).onchange = draw;
    $('#new', el).onclick = () => supplierModal(null);
    $('#tb', el).onclick = e => {
      const p = e.target.closest('[data-p]'), h = e.target.closest('[data-h]'), ed = e.target.closest('[data-e]');
      if (p) paymentModal('supplier', S.smap[p.dataset.p]); if (h) partyHistory('supplier', S.smap[h.dataset.h]); if (ed) supplierModal(S.smap[ed.dataset.e]);
    };
  }
};
function supplierModal(x) {
  const isNew = !x; x = x || {};
  modal(isNew ? 'Add supplier' : 'Edit supplier', `<div class="form"><label class="f full">Name<input name="name" value="${esc(x.name || '')}"></label><label class="f">Telephone<input name="phone" value="${esc(x.phone || '')}"></label><label class="f">Bank acc no<input name="accNo" value="${esc(x.accNo || '')}"></label><label class="f full">Address<input name="address" value="${esc(x.address || '')}"></label><label class="f">Next pay date<input type="date" name="payDate" value="${esc(x.payDate || '')}"></label>${isNew ? `<label class="f">Opening balance (payable)<input name="balance" inputmode="decimal"></label>` : `<label class="f row" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="active" ${x.active !== false ? 'checked' : ''}> Active</label>`}</div><div class="acts"><button class="btn p" id="sv">Save</button></div>`, {
    onMount(m, close) {
      $('#sv', m).onclick = async () => {
        const f = formData(m); if (!f.name.trim()) return toast('Name is required', true);
        const data = { name: f.name.trim(), phone: f.phone, accNo: f.accNo, address: f.address, payDate: f.payDate, updated: Date.now() };
        if (isNew) Object.assign(data, { balance: num(f.balance), active: true, ts: Date.now() }); else data.active = f.active;
        if (await commit([{ op: isNew ? 'set' : 'update', col: 'suppliers', id: x.id || S.db.newId('suppliers'), data }], 'Supplier saved')) close();
      };
    }
  });
}

// ================================================================ EMPLOYEES
VIEWS.employees = {
  title: () => 'Employees',
  html: () => `<div class="row" style="margin-bottom:12px"><span class="grow"></span><button class="btn" id="att">${ic('clock')}Attendance</button><button class="btn" id="pay">${ic('pay')}Pay employee</button><button class="btn p" id="new">${ic('plus')}Add employee</button></div><div class="panel"><div class="tbl-wrap" id="tb"></div></div>`,
  mount(el) {
    $('#tb', el).innerHTML = tableHTML([{ k: 'name', t: 'Name', html: e => `${esc(e.name)} ${e.active === false ? '<span class="tag r">Inactive</span>' : ''}` }, { k: 'username', t: 'Username' }, { k: 'role', t: 'Role', html: e => `<span class="tag ${e.role === 'admin' ? 'g' : 'c'}">${esc(e.role)}</span>` }, { k: 'phone', t: 'Telephone' }, { k: 'wage', t: 'Daily wage', money: 1 }, { k: 'x', t: '', html: e => `<button class="btn sm" data-e="${esc(e.id)}">${ic('edit')}</button>` }], S.employees);
    $('#new', el).onclick = () => employeeModal(null);
    $('#tb', el).onclick = e => { const b = e.target.closest('[data-e]'); if (b) employeeModal(S.employees.find(x => x.id === b.dataset.e)); };
    $('#att', el).onclick = attendanceModal;
    $('#pay', el).onclick = () => modal('Pay employee', `<div class="form"><label class="f">Employee<select name="emp">${S.employees.map(e => opt(e.id, e.name)).join('')}</select></label><label class="f">Amount<input name="amount" inputmode="decimal"></label><label class="f">Method<select name="method"><option>cash</option><option>transfer</option></select></label><label class="f">Note<input name="note" placeholder="Salary / advance…"></label></div><div class="acts"><button class="btn p" id="sv">Save</button></div>`, {
      onMount(m, close) {
        $('#sv', m).onclick = async () => {
          const f = formData(m), a = num(f.amount), emp = S.employees.find(x => x.id === f.emp); if (!a) return;
          if (await commit([{ op: 'set', col: 'expenses', id: S.db.newId('expenses'), data: { ts: Date.now(), day: today(), type: 'expense', category: 'Salary', amount: a, method: f.method, ref: emp.name, desc: f.note || 'Salary', empId: emp.id, by: S.me.username } }], 'Payment saved')) close();
        };
      }
    });
  }
};
function employeeModal(e) {
  const isNew = !e; e = e || { role: 'cashier' };
  modal(isNew ? 'Add employee' : 'Edit employee', `<div class="form"><label class="f full">Name<input name="name" value="${esc(e.name || '')}"></label>
    <label class="f">Username<input name="username" value="${esc(e.username || e.id || '')}" ${isNew ? '' : 'readonly'} autocapitalize="off"></label>
    ${isNew ? `<label class="f">Password (min 6)<input name="password" type="password" autocomplete="new-password"></label>` : '<div></div>'}
    <label class="f">Role<select name="role">${[['cashier', 'Cashier'], ['admin', 'Admin']].map(([k, t]) => opt(k, t, e.role)).join('')}</select></label><label class="f">Telephone<input name="phone" value="${esc(e.phone || '')}"></label>
    <label class="f">Daily wage<input name="wage" value="${e.wage || ''}" inputmode="decimal"></label>
    ${!isNew ? `<label class="f row" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="active" ${e.active !== false ? 'checked' : ''}> Active (can log in)</label>` : ''}</div>
    ${!isNew && e.id === S.me.id ? `<br><button class="btn" id="cp">Change my password</button>` : ''}
    <div class="acts"><button class="btn p" id="sv">Save</button></div>`, {
    onMount(m, close) {
      const cp = $('#cp', m); if (cp) cp.onclick = async () => { const pw = prompt('New password (min 6 characters)'); if (pw && pw.length >= 6) { try { await S.db.changePassword(pw); toast('Password changed'); } catch (er) { toast('Please log out, log in again and retry', true); } } };
      $('#sv', m).onclick = async () => {
        const f = formData(m), u = (f.username || '').trim().toLowerCase();
        if (!f.name.trim() || !u) return toast('Name and username are required', true);
        if (!/^[a-z0-9._-]+$/.test(u)) return toast('Username can contain only a-z, 0-9, dot, dash and underscore', true);
        if (isNew) {
          if (S.employees.some(x => x.id === u)) return toast('This username already exists', true);
          if ((f.password || '').length < 6) return toast('Password must be at least 6 characters', true);
          if (!navigator.onLine && S.db.mode !== 'demo') return toast('Internet is required to create a new login', true);
          try { await S.db.createLogin(u, f.password); } catch (er) { return toast('Could not create login: ' + er.message, true); }
        }
        const data = { username: u, name: f.name.trim(), role: f.role, phone: f.phone, wage: num(f.wage), updated: Date.now() };
        if (isNew) Object.assign(data, { active: true, ts: Date.now() }); else data.active = f.active;
        if (await commit([{ op: isNew ? 'set' : 'update', col: 'employees', id: u, data }], 'Employee saved')) { close(); route(); }
      };
    }
  });
}
async function attendanceModal() {
  const d = today(), rows = await S.db.where('attendance', 'day', d), map = Object.fromEntries(rows.map(r => [r.empId, r]));
  modal('Attendance — ' + d, S.employees.filter(e => e.active !== false).map(e => { const a = map[e.id]; return `<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)"><b class="grow">${esc(e.name)}</b><span class="muted">${a?.in ? 'In ' + fmtT(a.in) : ''} ${a?.out ? '· Out ' + fmtT(a.out) : ''}</span>${!a?.in ? `<button class="btn sm p" data-in="${e.id}">Check in</button>` : !a?.out ? `<button class="btn sm" data-out="${e.id}">Check out</button>` : '<span class="tag g">Done</span>'}</div>`; }).join(''), {
    onMount(m, close) {
      m.onclick = async e => {
        const i = e.target.closest('[data-in]'), o = e.target.closest('[data-out]'); if (!i && !o) return;
        const id = (i || o).dataset.in || (i || o).dataset.out;
        await commit([{ op: 'set', col: 'attendance', id: `${id}_${d}`, merge: true, data: i ? { empId: id, day: d, ts: Date.now(), in: Date.now() } : { out: Date.now() } }], 'Saved');
        close(); attendanceModal();
      };
    }
  });
}

// ================================================================ CASH IN / OUT
const CASHT = { expense: 'Expense', investment: 'Investment', cashin: 'Cash in', cashout: 'Cash out (drawing)' };
VIEWS.cash = {
  title: () => 'Cash In / Out',
  html: () => `<div class="card" style="margin-bottom:12px"><div class="row"><label class="f">From<input type="date" id="fr" value="${addDays(today(), -30)}"></label><label class="f">To<input type="date" id="to" value="${today()}"></label>
    <label class="f">Type<select id="ty"><option value="">All</option>${Object.entries(CASHT).map(([k, t]) => opt(k, t)).join('')}</select></label><label class="f">Category<select id="ct"><option value="">All</option>${expCats().map(c => opt(c, c)).join('')}</select></label>
    <span class="grow"></span><button class="btn" id="cats">Categories</button><button class="btn" id="pr">${ic('print')}</button><button class="btn p" id="new">${ic('plus')}Add entry</button></div></div>
    <div class="grid g4" id="st" style="margin-bottom:12px"></div><div class="panel"><div class="tbl-wrap" id="tb"></div></div>`,
  mount(el) {
    const cols = [{ k: 'dt', t: 'Date & time' }, { k: 'tname', t: 'Type' }, { k: 'category', t: 'Category' }, { k: 'ref', t: 'Reference' }, { k: 'desc', t: 'Description' }, { k: 'method', t: 'Method' }, { k: 'amount', t: 'Amount', money: 1 }, { k: 'by', t: 'Emp' }];
    let rows = [];
    const load = async () => {
      const all = await S.db.range('expenses', dStart($('#fr', el).value), dEnd($('#to', el).value));
      const ty = $('#ty', el).value, ct = $('#ct', el).value;
      rows = all.filter(r => (!ty || r.type === ty) && (!ct || r.category === ct)).map(r => ({ ...r, dt: fmtDT(r.ts), tname: CASHT[r.type] || r.type }));
      $('#st', el).innerHTML = Object.entries(CASHT).map(([k, t]) => `<div class="stat card"><div class="k">${t}</div><div class="v">${money(sum(all.filter(r => r.type === k), 'amount'))}</div></div>`).join('');
      $('#tb', el).innerHTML = tableHTML([...cols, { k: 'x', t: '', html: r => `<button class="btn sm" data-d="${r.id}">${ic('trash')}</button>` }], rows, { amount: sum(rows, 'amount') });
    };
    load();
    $$('#fr,#to,#ty,#ct', el).forEach(i => i.onchange = load);
    $('#pr', el).onclick = () => printTable('Cash In / Out', `${$('#fr', el).value} → ${$('#to', el).value}`, cols, rows, { amount: sum(rows, 'amount') });
    $('#cats', el).onclick = () => listEditor('Expense categories', expCats(), list => commit([{ op: 'set', col: 'meta', id: 'settings', merge: true, data: { expenseCategories: list } }], 'Saved'));
    $('#tb', el).onclick = async e => { const b = e.target.closest('[data-d]'); if (b && await confirmBox('Delete this entry?', 'Delete')) { await commit([{ op: 'delete', col: 'expenses', id: b.dataset.d }], 'Deleted'); load(); } };
    $('#new', el).onclick = () => modal('Add entry', `<div class="form"><label class="f">Type<select name="type">${Object.entries(CASHT).map(([k, t]) => opt(k, t)).join('')}</select></label><label class="f">Category<select name="category">${expCats().map(c => opt(c, c)).join('')}</select></label><label class="f">Amount<input name="amount" inputmode="decimal"></label><label class="f">Method<select name="method"><option>cash</option><option>transfer</option><option>card</option><option>cheque</option></select></label><label class="f">Reference<input name="ref"></label><label class="f">Date<input type="date" name="day" value="${today()}"></label><label class="f full">Description<input name="desc"></label></div><div class="acts"><button class="btn p" id="sv">Save</button></div>`, {
      onMount(m, close) {
        $('#sv', m).onclick = async () => {
          const f = formData(m), a = num(f.amount); if (!a) return toast('Enter an amount', true);
          const ts = f.day === today() ? Date.now() : dStart(f.day) + 12 * 3600e3;
          if (await commit([{ op: 'set', col: 'expenses', id: S.db.newId('expenses'), data: { ts, day: f.day, type: f.type, category: f.category, amount: a, method: f.method, ref: f.ref, desc: f.desc, by: S.me.username } }], 'Saved')) { close(); load(); }
        };
      }
    });
  }
};

// ================================================================ REPORTS
const REPORTS = [
  ['sales', 'Invoice Summary', 'pos'], ['daily', 'Daily Sales', 'reports'], ['items', 'Item Sales', 'products'], ['pnl', 'Profit & Loss', 'cash'],
  ['byemp', 'Sales by Employee', 'employees'], ['bycus', 'Sales by Customer', 'customers'], ['credcus', 'Credit Customers', 'customers'], ['credsup', 'Credit Suppliers', 'suppliers'],
  ['cuspay', 'Customer Payments', 'pay'], ['suppay', 'Supplier Payments', 'pay'], ['grns', 'GRN List', 'grn'], ['adjust', 'Stock Adjustments', 'verify'],
  ['moves', 'Stock Movement', 'stock'], ['reorder', 'Low Stock Reorder', 'stock'], ['returns', 'Return History', 'returns'], ['stockval', 'Stock Valuation', 'stock'],
  ['cashbox', 'Cash Collection', 'cash'], ['attendance', 'Attendance', 'clock']
];
VIEWS.reports = {
  title: () => 'Reports',
  html: () => `<div class="tiles">${REPORTS.map(([id, t, i]) => `<a class="tile panel" href="#/report/${id}"><span class="ic">${ic(i)}</span>${t}</a>`).join('')}</div>`
};
VIEWS.report = {
  title: id => (REPORTS.find(r => r[0] === id) || [, 'Report'])[1],
  html: id => {
    const noRange = ['credcus', 'credsup', 'reorder', 'stockval'].includes(id);
    return `<div class="card" style="margin-bottom:12px"><div class="row"><a class="btn sm" href="#/reports">← Reports</a>
    ${noRange ? '' : `<label class="f">From<input type="date" id="fr" value="${today().slice(0, 8)}01"></label><label class="f">To<input type="date" id="to" value="${today()}"></label>
    <div class="seg" id="qk"><button data-q="0">Today</button><button data-q="1">Yesterday</button><button data-q="7">7 days</button><button data-q="m">This month</button><button data-q="lm">Last month</button></div>`}
    ${['sales', 'byemp'].includes(id) ? `<label class="f">Employee<select id="emp"><option value="">All</option>${S.employees.map(e => opt(e.id, e.name)).join('')}</select></label>` : ''}
    ${['items', 'reorder', 'stockval'].includes(id) ? `<label class="f">Category<select id="cat"><option value="">All</option>${cats().map(c => opt(c, c)).join('')}</select></label>` : ''}
    ${id === 'moves' ? `<label class="f">Product<select id="prod"><option value="">All</option>${S.products.map(p => opt(p.code, p.name)).join('')}</select></label>` : ''}
    <span class="grow"></span><button class="btn" id="csv">${ic('download')}Excel</button><button class="btn" id="pr">${ic('print')}Print</button></div></div>
    <div id="sm"></div><div class="panel"><div class="tbl-wrap" id="tb"><div class="empty">Loading…</div></div></div>`;
  },
  async mount(el, id) {
    let res = null;
    const v = s => $(s, el)?.value || '';
    const run = async () => {
      const f = { from: v('#fr') ? dStart(v('#fr')) : 0, to: v('#to') ? dEnd(v('#to')) : Date.now(), fd: v('#fr'), td: v('#to'), emp: v('#emp'), cat: v('#cat'), prod: v('#prod') };
      $('#tb', el).innerHTML = '<div class="empty">Loading…</div>';
      try { res = await RUN[id](f); } catch (e) { console.error(e); $('#tb', el).innerHTML = `<div class="empty bad">${esc(e.message)}</div>`; return; }
      res.sub = f.fd ? `${f.fd} → ${f.td}` : today();
      $('#sm', el).innerHTML = (res.stats ? `<div class="grid g4" style="margin-bottom:12px">${res.stats.map(([k, val, c]) => `<div class="stat card"><div class="k">${k}</div><div class="v ${c || ''}">${val}</div></div>`).join('')}</div>` : '') + (res.chart ? `<div class="card" style="margin-bottom:12px">${res.chart}</div>` : '');
      $('#tb', el).innerHTML = tableHTML(res.cols, res.rows, res.foot);
    };
    $$('input,select', el).forEach(i => i.onchange = run);
    const qk = $('#qk', el);
    if (qk) qk.onclick = e => {
      const b = e.target.closest('button'); if (!b) return; const t = today(); let a = t, z = t;
      if (b.dataset.q === '1') a = z = addDays(t, -1); else if (b.dataset.q === '7') a = addDays(t, -6); else if (b.dataset.q === 'm') a = t.slice(0, 8) + '01';
      else if (b.dataset.q === 'lm') { const d = new Date(t.slice(0, 8) + '01T12:00'); d.setMonth(d.getMonth() - 1); a = dayOf(d); z = addDays(t.slice(0, 8) + '01', -1); }
      $('#fr', el).value = a; $('#to', el).value = z; run();
    };
    $('#csv', el).onclick = () => res && downloadCSV(id + '-' + today(), res.cols.filter(c => c.k !== 'x'), res.rows);
    $('#pr', el).onclick = () => res && printTable(VIEWS.report.title(id), res.sub, res.cols.filter(c => c.k !== 'x'), res.rows, res.foot);
    $('#tb', el).onclick = e => { const b = e.target.closest('[data-inv]'); if (b) { const inv = res.rows.find(r => r.id === b.dataset.inv); inv && invoiceModal(inv, inv.id); } };
    run();
  }
};
const invRange = async f => (await S.db.range('invoices', f.from, f.to)).filter(i => i.status !== 'void' && (!f.emp || i.by === f.emp));
const barChart = (labels, vals) => { const mx = Math.max(...vals, 1); return `<div class="bars" style="height:170px">${vals.map((x, i) => `<div class="b" title="${labels[i]}: ${money(x)}"><i style="height:${x / mx * 100}%"></i><span>${labels.length > 16 ? (i % 3 ? '' : labels[i]) : labels[i]}</span></div>`).join('')}</div>`; };
const RUN = {
  async sales(f) {
    const all = (await S.db.range('invoices', f.from, f.to)).filter(i => !f.emp || i.by === f.emp);
    const rows = all.map(i => ({ ...i, dt: fmtDT(i.ts), status: i.status, credit: num(i.pay?.credit), cash: num(i.pay?.cash) - num(i.change), card: num(i.pay?.card), transfer: num(i.pay?.transfer), cheque: num(i.pay?.cheque) }));
    const ok = rows.filter(r => r.status !== 'void');
    const cols = [{ k: 'no', t: 'Inv', html: r => `<a href="javascript:void 0" data-inv="${r.id}">${esc(r.no)}</a> ${r.status === 'void' ? `<span class="tag r" title="Deleted by ${esc(r.voidBy || '')}">deleted</span>` : ''}` }, { k: 'dt', t: 'Date & time' }, { k: 'customerName', t: 'Customer' }, { k: 'byName', t: 'Cashier' }, { k: 'total', t: 'Total', money: 1 }, { k: 'cash', t: 'Cash', money: 1 }, { k: 'card', t: 'Card', money: 1 }, { k: 'transfer', t: 'Transfer', money: 1 }, { k: 'cheque', t: 'Cheque', money: 1 }, { k: 'credit', t: 'Credit', money: 1 }];
    const foot = Object.fromEntries(['total', 'cash', 'card', 'transfer', 'cheque', 'credit'].map(k => [k, sum(ok, k)]));
    return { cols, rows, foot, stats: [['Invoices', ok.length], ['Sales', money(foot.total)], ['Cash', money(foot.cash)], ['Avg bill', money(ok.length ? foot.total / ok.length : 0)]] };
  },
  async daily(f) {
    const inv = await invRange(f), rets = await S.db.range('returns', f.from, f.to), map = {};
    for (let d = f.fd; d <= f.td; d = addDays(d, 1)) map[d] = { day: d, count: 0, total: 0, cost: 0, profit: 0, cash: 0, other: 0, returns: 0, old: 0 };
    inv.forEach(i => { const m = map[i.day]; if (!m) return; m.count++; m.total += i.total; if (i.imported) m.old++; else { m.cost += num(i.cost); m.profit += num(i.profit); } m.cash += num(i.pay?.cash) - num(i.change); m.other += i.total - (num(i.pay?.cash) - num(i.change)); });
    rets.forEach(r => { const m = map[r.day]; if (m) m.returns += r.total; });
    const rows = Object.values(map).reverse();
    const cols = [{ k: 'day', t: 'Date' }, { k: 'count', t: 'Invoices', num: 1 }, { k: 'total', t: 'Sales', money: 1 }, { k: 'cash', t: 'Cash', money: 1 }, { k: 'other', t: 'Card/Other', money: 1 }, { k: 'returns', t: 'Returns', money: 1 }, ...(isAdmin() ? [{ k: 'cost', t: 'Cost', money: 1, html: r => r.old && r.old === r.count ? '<span class="dim">–</span>' : money(r.cost) }, { k: 'profit', t: 'Profit', money: 1, html: r => r.old && r.old === r.count ? '<span class="dim" title="Old ERP bills — no cost data">–</span>' : money(r.profit) + (r.old ? ' <span class="tag a" title="Old ERP bills are not included in profit">+old</span>' : '') }] : [])];
    const foot = Object.fromEntries(['count', 'total', 'cash', 'other', 'returns', 'cost', 'profit'].map(k => [k, sum(rows, k)]));
    const asc = [...rows].reverse();
    return { cols, rows, foot, chart: rows.length <= 62 ? barChart(asc.map(r => r.day.slice(8)), asc.map(r => r.total)) : '', stats: [['Sales', money(foot.total)], ['Profit' + (sum(rows, 'old') ? ' (new bills)' : ''), foot.count && sum(rows, 'old') === foot.count ? '–' : money(foot.profit), 'good'], ['Invoices', foot.count], ['Returns', money(foot.returns), 'warn']] };
  },
  async items(f) {
    const inv = await invRange(f), m = {};
    inv.forEach(i => { const ratio = i.subtotal ? i.total / i.subtotal : 1; i.items.forEach(l => { const p = S.pmap[l.code]; if (f.cat && p?.category !== f.cat) return; const x = m[l.code] = m[l.code] || { code: l.code, name: l.name, category: p?.category || '', qty: 0, sales: 0, cost: 0 }; x.qty += l.qty; x.sales += (l.qty * l.price - num(l.disc)) * ratio; x.cost += l.qty * num(l.cost); }); });
    const rows = Object.values(m).map(x => ({ ...x, profit: x.sales - x.cost })).sort(by('qty', true));
    const oldN = inv.filter(i => i.imported).length;
    const foot = { qty: sum(rows, 'qty'), sales: sum(rows, 'sales'), cost: sum(rows, 'cost'), profit: sum(rows, 'profit') };
    return { cols: [{ k: 'code', t: 'ID' }, { k: 'name', t: 'Item' }, { k: 'category', t: 'Category' }, { k: 'qty', t: 'Qty', num: 1 }, { k: 'sales', t: 'Sales', money: 1 }, { k: 'cost', t: 'Cost', money: 1 }, { k: 'profit', t: 'Profit', money: 1 }], rows, foot, stats: [['Items sold', qtyf(foot.qty)], ['Sales', money(foot.sales)], ['Cost', money(foot.cost)], ['Profit', money(foot.profit), 'good']], chart: oldN ? `<span class="muted">${oldN} old ERP bills are not included in this report (no item details).</span>` : '' };
  },
  async pnl(f) {
    const [inv, rets, exp, adj] = await Promise.all([invRange(f), S.db.range('returns', f.from, f.to), S.db.range('expenses', f.from, f.to), S.db.range('adjustments', f.from, f.to)]);
    const oldInv = inv.filter(i => i.imported), newInv = inv.filter(i => !i.imported);
    const sales = sum(newInv, 'total'), cogs = sum(newInv, 'cost'), ret = sum(rets, 'total'), retCost = sum(rets, 'cost'), oldSales = sum(oldInv, 'total');
    const loss = -sum(adj.filter(a => a.qty < 0), a => a.qty * num(a.cost)), gain = sum(adj.filter(a => a.qty > 0), a => a.qty * num(a.cost));
    const ex = exp.filter(e => e.type === 'expense'), byCat = {};
    ex.forEach(e => byCat[e.category] = (byCat[e.category] || 0) + num(e.amount));
    const gross = sales - ret - (cogs - retCost);
    const net = gross - sum(ex, 'amount') - loss + gain;
    const rows = [{ item: 'Sales', amount: sales }, { item: 'Less: Returns', amount: -ret }, { item: 'Net sales', amount: sales - ret, b: 1 }, { item: 'Cost of goods sold', amount: -(cogs - retCost) }, { item: 'GROSS PROFIT', amount: gross, b: 1 },
      ...Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ item: 'Expense: ' + k, amount: -v })), { item: 'Stock loss (damage/lost)', amount: -loss }, { item: 'Stock gain', amount: gain }, { item: 'NET PROFIT', amount: net, b: 1 }, ...(oldSales ? [{ item: 'Old ERP sales (no cost data — not included in profit)', amount: oldSales }] : [])];
    return { cols: [{ k: 'item', t: 'Item', html: r => r.b ? `<b>${esc(r.item)}</b>` : esc(r.item) }, { k: 'amount', t: 'Amount', html: r => `<span class="${r.amount < 0 ? 'bad' : ''}">${r.b ? '<b>' : ''}${money(r.amount)}${r.b ? '</b>' : ''}</span>` }], rows, stats: [['Net sales', money(sales - ret)], ['Gross profit', money(gross), 'good'], ['Expenses', money(sum(ex, 'amount')), 'warn'], ['Net profit', money(net), net >= 0 ? 'good' : 'bad']] };
  },
  async byemp(f) {
    const inv = await invRange(f), m = {};
    inv.forEach(i => { const x = m[i.by] = m[i.by] || { name: i.byName || i.by, count: 0, total: 0, profit: 0, cash: 0 }; x.count++; x.total += i.total; x.profit += num(i.profit); x.cash += num(i.pay?.cash) - num(i.change); });
    const rows = Object.values(m).sort(by('total', true));
    return { cols: [{ k: 'name', t: 'Employee' }, { k: 'count', t: 'Invoices', num: 1 }, { k: 'total', t: 'Sales', money: 1 }, { k: 'cash', t: 'Cash collected', money: 1 }, { k: 'profit', t: 'Profit', money: 1 }], rows, foot: { count: sum(rows, 'count'), total: sum(rows, 'total'), cash: sum(rows, 'cash'), profit: sum(rows, 'profit') } };
  },
  async bycus(f) {
    const inv = await invRange(f), m = {};
    inv.forEach(i => { const k = i.customerId || 'cash'; const x = m[k] = m[k] || { name: i.customerName, count: 0, total: 0, credit: 0 }; x.count++; x.total += i.total; x.credit += num(i.pay?.credit); });
    const rows = Object.values(m).sort(by('total', true));
    return { cols: [{ k: 'name', t: 'Customer' }, { k: 'count', t: 'Invoices', num: 1 }, { k: 'total', t: 'Sales', money: 1 }, { k: 'credit', t: 'On credit', money: 1 }], rows, foot: { count: sum(rows, 'count'), total: sum(rows, 'total'), credit: sum(rows, 'credit') } };
  },
  async credcus() { const rows = S.customers.filter(c => num(c.balance) !== 0).sort(by('balance', true)); return { cols: [{ k: 'name', t: 'Customer' }, { k: 'phone', t: 'Phone' }, { k: 'payDate', t: 'Pay date' }, { k: 'creditLimit', t: 'Limit', money: 1 }, { k: 'balance', t: 'Balance', money: 1 }], rows, foot: { balance: sum(rows, 'balance') } }; },
  async credsup() { const rows = S.suppliers.filter(c => num(c.balance) !== 0).sort(by('balance', true)); return { cols: [{ k: 'name', t: 'Supplier' }, { k: 'phone', t: 'Phone' }, { k: 'payDate', t: 'Pay date' }, { k: 'balance', t: 'Balance', money: 1 }], rows, foot: { balance: sum(rows, 'balance') } }; },
  async cuspay(f) { const rows = (await S.db.range('payments', f.from, f.to)).filter(p => p.party === 'customer').map(p => ({ ...p, dt: fmtDT(p.ts) })); return { cols: [{ k: 'dt', t: 'Date' }, { k: 'partyName', t: 'Customer' }, { k: 'method', t: 'Method' }, { k: 'note', t: 'Note' }, { k: 'by', t: 'By' }, { k: 'amount', t: 'Amount', money: 1 }], rows, foot: { amount: sum(rows, 'amount') } }; },
  async suppay(f) { const rows = (await S.db.range('payments', f.from, f.to)).filter(p => p.party === 'supplier').map(p => ({ ...p, dt: fmtDT(p.ts) })); return { cols: [{ k: 'dt', t: 'Date' }, { k: 'partyName', t: 'Supplier' }, { k: 'method', t: 'Method' }, { k: 'note', t: 'Note' }, { k: 'by', t: 'By' }, { k: 'amount', t: 'Amount', money: 1 }], rows, foot: { amount: sum(rows, 'amount') } }; },
  async grns(f) { const rows = (await S.db.range('grns', f.from, f.to)).map(g => ({ ...g, dt: fmtDT(g.ts), n: g.items.length, unpaid: g.total - num(g.paid) })); return { cols: [{ k: 'no', t: 'GRN' }, { k: 'dt', t: 'Date' }, { k: 'supplierName', t: 'Supplier' }, { k: 'ref', t: 'Ref' }, { k: 'n', t: 'Items', num: 1 }, { k: 'total', t: 'Total', money: 1 }, { k: 'paid', t: 'Paid', money: 1 }, { k: 'unpaid', t: 'Unpaid', money: 1 }], rows, foot: { total: sum(rows, 'total'), paid: sum(rows, 'paid'), unpaid: sum(rows, 'unpaid') } }; },
  async adjust(f) { const rows = (await S.db.range('adjustments', f.from, f.to)).map(a => ({ ...a, dt: fmtDT(a.ts), val: a.qty * num(a.cost) })); return { cols: [{ k: 'dt', t: 'Date' }, { k: 'name', t: 'Item' }, { k: 'reason', t: 'Reason' }, { k: 'note', t: 'Note' }, { k: 'before', t: 'Before', num: 1 }, { k: 'qty', t: 'Qty', num: 1 }, { k: 'val', t: 'Value', money: 1 }, { k: 'by', t: 'By' }], rows, foot: { val: sum(rows, 'val') } }; },
  async moves(f) { let rows = await S.db.range('stockMoves', f.from, f.to); if (f.prod) rows = rows.filter(m => m.code === f.prod); rows = rows.map(m => ({ ...m, dt: fmtDT(m.ts), after: num(m.before) + num(m.qty) })); return { cols: [{ k: 'dt', t: 'Date' }, { k: 'name', t: 'Item' }, { k: 'type', t: 'Type' }, { k: 'ref', t: 'Ref' }, { k: 'before', t: 'Before', num: 1 }, { k: 'qty', t: 'Qty', num: 1 }, { k: 'after', t: 'After', num: 1 }, { k: 'by', t: 'By' }], rows }; },
  async reorder(f) { const rows = S.products.filter(p => p.active !== false && num(p.stock) <= num(p.reorder) && (!f.cat || p.category === f.cat)).map(p => ({ ...p, need: Math.max(0, num(p.reorder) * 2 - num(p.stock)) })); return { cols: [{ k: 'code', t: 'ID' }, { k: 'name', t: 'Item' }, { k: 'category', t: 'Category' }, { k: 'lastSupplier', t: 'Last supplier' }, { k: 'stock', t: 'Stock', num: 1 }, { k: 'reorder', t: 'Reorder lvl', num: 1 }, { k: 'need', t: 'Suggest order', num: 1 }], rows }; },
  async returns(f) { const rows = (await S.db.range('returns', f.from, f.to)).map(r => ({ ...r, dt: fmtDT(r.ts), items_: r.items.map(l => `${l.name} ×${l.qty}`).join(', ') })); return { cols: [{ k: 'no', t: 'Return' }, { k: 'dt', t: 'Date' }, { k: 'invoiceNo', t: 'Invoice' }, { k: 'customerName', t: 'Customer' }, { k: 'items_', t: 'Items' }, { k: 'method', t: 'Refund' }, { k: 'reason', t: 'Reason' }, { k: 'total', t: 'Total', money: 1 }], rows, foot: { total: sum(rows, 'total') } }; },
  async stockval(f) {
    const m = {}; S.products.filter(p => !f.cat || p.category === f.cat).forEach(p => { const x = m[p.category] = m[p.category] || { category: p.category, items: 0, qty: 0, cost: 0, sell: 0 }; if (num(p.stock) > 0) { x.items++; x.qty += num(p.stock); x.cost += num(p.stock) * num(p.cost); x.sell += num(p.stock) * num(p.retail); } });
    const rows = Object.values(m).map(x => ({ ...x, margin: x.sell - x.cost })); const foot = Object.fromEntries(['items', 'qty', 'cost', 'sell', 'margin'].map(k => [k, sum(rows, k)]));
    return { cols: [{ k: 'category', t: 'Category' }, { k: 'items', t: 'Items', num: 1 }, { k: 'qty', t: 'Qty', num: 1 }, { k: 'cost', t: 'Cost value', money: 1 }, { k: 'sell', t: 'Selling value', money: 1 }, { k: 'margin', t: 'Expected profit', money: 1 }], rows, foot, stats: [['Cost value', money(foot.cost)], ['Selling value', money(foot.sell)], ['Expected profit', money(foot.margin), 'good'], ['Qty', qtyf(foot.qty)]] };
  },
  async cashbox(f) {
    const [inv, exp, pays, rets] = await Promise.all([invRange(f), S.db.range('expenses', f.from, f.to), S.db.range('payments', f.from, f.to), S.db.range('returns', f.from, f.to)]);
    const map = {}; for (let d = f.fd; d <= f.td; d = addDays(d, 1)) map[d] = { day: d, sales: 0, cusPay: 0, cashIn: 0, exp: 0, supPay: 0, refunds: 0 };
    inv.forEach(i => map[i.day] && (map[i.day].sales += num(i.pay?.cash) - num(i.change)));
    pays.filter(p => p.method === 'cash').forEach(p => { const m = map[p.day]; if (!m) return; if (p.party === 'customer') m.cusPay += p.amount; else m.supPay += p.amount; });
    exp.filter(e => (e.method || 'cash') === 'cash').forEach(e => { const m = map[e.day]; if (!m) return; if (e.type === 'cashin' || e.type === 'investment') m.cashIn += num(e.amount); else m.exp += num(e.amount); });
    rets.filter(r => r.method === 'cash').forEach(r => map[r.day] && (map[r.day].refunds += r.total));
    const rows = Object.values(map).reverse().map(r => ({ ...r, net: r.sales + r.cusPay + r.cashIn - r.exp - r.supPay - r.refunds }));
    const foot = Object.fromEntries(['sales', 'cusPay', 'cashIn', 'exp', 'supPay', 'refunds', 'net'].map(k => [k, sum(rows, k)]));
    return { cols: [{ k: 'day', t: 'Date' }, { k: 'sales', t: 'Cash sales', money: 1 }, { k: 'cusPay', t: 'Customer paid', money: 1 }, { k: 'cashIn', t: 'Cash in', money: 1 }, { k: 'exp', t: 'Expenses / out', money: 1 }, { k: 'supPay', t: 'Supplier paid', money: 1 }, { k: 'refunds', t: 'Refunds', money: 1 }, { k: 'net', t: 'Net cash', money: 1 }], rows, foot };
  },
  async attendance(f) { const rows = (await S.db.range('attendance', f.from, f.to)).map(a => ({ ...a, name: S.employees.find(e => e.id === a.empId)?.name || a.empId, i: a.in ? fmtT(a.in) : '', o: a.out ? fmtT(a.out) : '', hrs: a.in && a.out ? r2((a.out - a.in) / 3600e3) : 0 })); return { cols: [{ k: 'day', t: 'Date' }, { k: 'name', t: 'Employee' }, { k: 'i', t: 'In' }, { k: 'o', t: 'Out' }, { k: 'hrs', t: 'Hours', num: 1 }], rows, foot: { hrs: sum(rows, 'hrs') } }; }
};

// ================================================================ SETTINGS
VIEWS.settings = {
  title: () => 'Settings',
  html: () => {
    const s = shop(), d = device();
    return `<div class="grid g2"><div class="card"><h2>Shop details (shown on receipt)</h2><div class="form" id="sf">
      <label class="f full">Shop name<input name="name" value="${esc(s.name)}"></label><label class="f">Phone<input name="phone" value="${esc(s.phone)}"></label><label class="f">Address<input name="address" value="${esc(s.address)}"></label>
      <label class="f full">Receipt footer<input name="receiptFooter" value="${esc(s.receiptFooter)}"></label></div><div class="acts"><button class="btn p" id="ss">Save</button></div></div>
    <div class="card"><h2>This device</h2><p class="muted">Give each device its own invoice prefix (A, B, C…) so two devices never create the same invoice number while offline.</p><div class="form"><label class="f">Device code<input id="dc" value="${esc(d.code || 'A')}" maxlength="2"></label><label class="f">Last invoice no<input id="ds" value="${d.seq || 0}" inputmode="numeric"></label></div><div class="acts"><button class="btn p" id="sd">Save</button></div></div>
    <div class="card"><h2>Data</h2><p class="muted">Mode: <b>${S.db.mode === 'firebase' ? 'Firebase (online sync)' : 'Demo (this device only)'}</b></p><div class="row"><button class="btn" id="bk">${ic('download')}Backup (JSON)</button><label class="btn">${ic('upload')}Restore<input type="file" id="rs" accept=".json" hidden></label><button class="btn" id="imp">Old ERP data import</button></div></div>
    <div class="card"><h2>App</h2><p class="muted">Version 1.0 · Offline ready ${'serviceWorker' in navigator ? '✓' : '✗'}</p><div class="row"><button class="btn" id="upd">Update check</button></div></div></div>`;
  },
  mount(el) {
    $('#ss', el).onclick = () => commit([{ op: 'set', col: 'meta', id: 'settings', merge: true, data: { shop: formData($('#sf', el)) } }], 'Saved');
    $('#sd', el).onclick = () => { setDevice({ code: $('#dc', el).value.trim().toUpperCase() || 'A', seq: num($('#ds', el).value) }); toast('Saved'); renderShell(); route(); };
    $('#imp', el).onclick = importSeed;
    $('#upd', el).onclick = async () => { const r = await navigator.serviceWorker?.getRegistration(); await r?.update(); toast('If a new version is available it will load after reload'); setTimeout(() => location.reload(), 900); };
    $('#bk', el).onclick = async () => {
      const cols = ['products', 'customers', 'suppliers', 'employees', 'invoices', 'returns', 'grns', 'payments', 'expenses', 'adjustments', 'stockMoves', 'attendance', 'meta'];
      const out = {}; for (const c of cols) out[c] = await S.db.all(c);
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' })); a.download = `colombovapes-backup-${today()}.json`; a.click();
    };
    $('#rs', el).onchange = async e => {
      const file = e.target.files[0]; if (!file) return;
      if (!(await confirmBox('Restore this backup? Existing records with the same ID will be overwritten.', 'Restore'))) return;
      const data = JSON.parse(await file.text()), ops = [];
      for (const [col, list] of Object.entries(data)) for (const d of list) { const { id, ...rest } = d; ops.push({ op: 'set', col, id, data: rest }); }
      for (let i = 0; i < ops.length; i += 400) await commit(ops.slice(i, i + 400));
      toast('Restore complete');
    };
  }
};
