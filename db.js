// Data layer: Firebase Firestore (offline cache + auto sync) or local demo mode.
// API is the same for both, so the UI never cares which one is running.
import { CONFIG } from './config.js';

const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
export const INC = n => ({ __inc: Number(n) || 0 });

let pending = 0;
const syncListeners = new Set();
function emitSync() { syncListeners.forEach(f => f({ pending, online: navigator.onLine })); }
window.addEventListener('online', emitSync);
window.addEventListener('offline', emitSync);
function track(p) {
  pending++; emitSync();
  // Firestore write promises resolve only when the server has the data.
  p.catch(e => console.error('write failed', e)).finally(() => { pending--; emitSync(); });
}

export async function createDB() {
  const useFirebase = !!(CONFIG.firebase && CONFIG.firebase.apiKey);
  return useFirebase ? firebaseDB() : localDB();
}

// ------------------------------------------------------------------ Firebase
async function firebaseDB() {
  const [appM, fs, au] = await Promise.all([import(FB + 'firebase-app.js'), import(FB + 'firebase-firestore.js'), import(FB + 'firebase-auth.js')]);
  const app = appM.initializeApp(CONFIG.firebase);
  const db = fs.initializeFirestore(app, {
    localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() })
  });
  const auth = au.getAuth(app);
  await au.setPersistence(auth, au.indexedDBLocalPersistence);

  const conv = data => {
    const o = {};
    for (const [k, v] of Object.entries(data)) o[k] = (v && typeof v === 'object' && '__inc' in v) ? fs.increment(v.__inc) : v;
    return o;
  };
  const docs = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const email = u => u.includes('@') ? u : `${u.toLowerCase()}@${CONFIG.loginDomain}`;

  // Firestore can't run a range query offline that it never ran online,
  // so we only rely on cached docs; recent data is kept warm by watchers.
  return {
    mode: 'firebase',
    onSync(f) { syncListeners.add(f); f({ pending, online: navigator.onLine }); },
    onAuth(cb) { return au.onAuthStateChanged(auth, u => cb(u ? { uid: u.uid, username: u.email.split('@')[0] } : null)); },
    async login(username, password) { await au.signInWithEmailAndPassword(auth, email(username), password); },
    async logout() { await au.signOut(auth); },
    async createLogin(username, password) {
      // second app instance so the admin stays signed in
      const sec = appM.getApps().find(a => a.name === 'sec') || appM.initializeApp(CONFIG.firebase, 'sec');
      const sa = au.getAuth(sec);
      await au.createUserWithEmailAndPassword(sa, email(username), password);
      await au.signOut(sa);
    },
    async changePassword(newPw) { await au.updatePassword(auth.currentUser, newPw); },
    watch(col, cb, opts = {}) {
      let q = fs.collection(db, col);
      if (opts.since) q = fs.query(q, fs.where('ts', '>=', opts.since));
      return fs.onSnapshot(q, { includeMetadataChanges: !!opts.meta }, s => cb(docs(s), { fromCache: s.metadata.fromCache }), e => { console.error(col, e); cb([], { fromCache: false, error: e }); });
    },
    async get(col, id) { const s = await fs.getDoc(fs.doc(db, col, id)); return s.exists() ? { id: s.id, ...s.data() } : null; },
    async all(col) { return docs(await fs.getDocs(fs.collection(db, col))); },
    async range(col, from, to, field = 'ts') {
      const q = fs.query(fs.collection(db, col), fs.where(field, '>=', from), fs.where(field, '<=', to), fs.orderBy(field, 'desc'));
      try { return docs(await fs.getDocs(q)); }
      catch (e) { return docs(await fs.getDocsFromCache(q)); }
    },
    async where(col, field, val) {
      const q = fs.query(fs.collection(db, col), fs.where(field, '==', val));
      return docs(await fs.getDocs(q));
    },
    newId(col) { return fs.doc(fs.collection(db, col)).id; },
    // waits until the server has the data (used for first-login setup)
    async commitWait(ops) {
      const b = fs.writeBatch(db);
      for (const o of ops) b.set(fs.doc(db, o.col, o.id), conv(o.data), { merge: o.op !== 'set' || !!o.merge });
      await b.commit();
    },
    // ops: [{op:'set'|'update'|'delete', col, id, data}] -> atomic, works offline
    commit(ops) {
      const b = fs.writeBatch(db);
      for (const o of ops) {
        const ref = fs.doc(db, o.col, o.id);
        if (o.op === 'set') b.set(ref, conv(o.data), { merge: !!o.merge });
        else if (o.op === 'update') b.set(ref, conv(o.data), { merge: true });
        else if (o.op === 'delete') b.delete(ref);
      }
      const p = b.commit(); track(p);
      return Promise.resolve(); // don't wait for server: UI stays instant offline
    }
  };
}

// ------------------------------------------------------------------ Local demo
function localDB() {
  const KEY = 'cv_erp_demo_v1';
  let store = {};
  try { store = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { store = {}; }
  const watchers = {};
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} };
  const list = col => Object.entries(store[col] || {}).map(([id, d]) => ({ id, ...d }));
  const fire = col => (watchers[col] || []).forEach(w => w.cb(w.since ? list(col).filter(d => d.ts >= w.since) : list(col)));
  let user = null; const authCbs = [];
  try { user = JSON.parse(sessionStorage.getItem('cv_demo_user') || 'null'); } catch (e) {}
  const apply = (cur, data) => {
    const o = { ...(cur || {}) };
    for (const [k, v] of Object.entries(data)) o[k] = (v && typeof v === 'object' && '__inc' in v) ? (Number(o[k]) || 0) + v.__inc : v;
    return o;
  };
  return {
    mode: 'demo',
    onSync(f) { syncListeners.add(f); f({ pending: 0, online: navigator.onLine }); },
    onAuth(cb) { authCbs.push(cb); setTimeout(() => cb(user), 0); },
    async login(username, password) {
      const pw = (store.__pw || {})[username.toLowerCase()];
      const ok = pw ? pw === password : (username.toLowerCase() === 'admin' && password === 'admin123');
      if (!ok) throw new Error('auth/invalid-credential');
      user = { uid: username.toLowerCase(), username: username.toLowerCase() };
      sessionStorage.setItem('cv_demo_user', JSON.stringify(user)); authCbs.forEach(c => c(user));
    },
    async logout() { user = null; sessionStorage.removeItem('cv_demo_user'); authCbs.forEach(c => c(null)); },
    async createLogin(username, password) { store.__pw = store.__pw || {}; store.__pw[username.toLowerCase()] = password; save(); },
    async changePassword(pw) { store.__pw = store.__pw || {}; store.__pw[user.username] = pw; save(); },
    watch(col, cb, opts = {}) {
      (watchers[col] = watchers[col] || []).push({ cb, since: opts.since });
      setTimeout(() => cb(opts.since ? list(col).filter(d => d.ts >= opts.since) : list(col)), 0);
      return () => {};
    },
    async get(col, id) { const d = (store[col] || {})[id]; return d ? { id, ...d } : null; },
    async all(col) { return list(col); },
    async range(col, from, to, field = 'ts') { return list(col).filter(d => d[field] >= from && d[field] <= to).sort((a, b) => b[field] > a[field] ? 1 : -1); },
    async where(col, field, val) { return list(col).filter(d => d[field] === val); },
    newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },
    async commitWait(ops) { return this.commit(ops); },
    commit(ops) {
      const touched = new Set();
      for (const o of ops) {
        store[o.col] = store[o.col] || {};
        if (o.op === 'delete') delete store[o.col][o.id];
        else if (o.op === 'set' && !o.merge) store[o.col][o.id] = apply({}, o.data);
        else store[o.col][o.id] = apply(store[o.col][o.id], o.data);
        touched.add(o.col);
      }
      save(); touched.forEach(fire);
      return Promise.resolve();
    }
  };
}
