const origin = 'https://xinxincodingc.github.io';
const dayOf = date => new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const cors = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, PUT, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Cache-Control':'no-store'};
const json = (data, status = 200) => new Response(JSON.stringify(data), {status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}});
const bytes = new TextEncoder();
const hex = buffer => Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,'0')).join('');
const hash = async text => hex(await crypto.subtle.digest('SHA-256',bytes.encode(text)));
async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw',bytes.encode(password),'PBKDF2',false,['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:bytes.encode(salt),iterations:100000,hash:'SHA-256'},key,256));
}
async function signingKey(env) {
  return crypto.subtle.importKey('raw',bytes.encode(env.SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
}
async function signature(env, payload) { return hex(await crypto.subtle.sign('HMAC',await signingKey(env),bytes.encode(payload))); }
async function authorized(request, env) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer /,'');
  const [expiry,version,sig] = token.split('.');
  if (!expiry || Number(expiry) < Date.now() || !version || !sig) return false;
  const current = await env.DB.prepare("SELECT value FROM settings WHERE key = 'auth_version'").first();
  return version === (current?.value || '0') && sig === await signature(env,`${expiry}.${version}`);
}
async function adminRoute(request, env, path) {
  if (!env.SESSION_SECRET || !env.ADMIN_PASSWORD) return json({error:'管理员服务尚未配置。'},503);
  if (request.headers.get('Origin') !== origin) return json({error:'访问来源不正确。'},403);
  if (request.method !== 'POST' && request.method !== 'PUT') return json({error:'Method not allowed'},405);
  const raw = await request.text();
  if (raw.length > 600000) return json({error:'提交内容过大。'},413);
  let data;
  try { data = JSON.parse(raw); } catch { return json({error:'提交格式不正确。'},400); }
  if (path === '/admin/login') {
    if (typeof data.password !== 'string' || data.password.length > 200) return json({error:'密码格式不正确。'},400);
    const client = await hash(request.headers.get('CF-Connecting-IP') || 'unknown');
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE client = ? AND created_at > ?').bind(client,Date.now()-900000).first();
    if (count.n >= 10) return json({error:'尝试次数过多，请 15 分钟后重试。'},429);
    await env.DB.prepare('INSERT INTO login_attempts (client, created_at) VALUES (?, ?)').bind(client,Date.now()).run();
    const saved = await env.DB.prepare("SELECT value FROM settings WHERE key = 'password'").first();
    let valid;
    if (saved) { const record = JSON.parse(saved.value); valid = await passwordHash(data.password,record.salt) === record.hash; }
    else valid = await hash(data.password) === await hash(env.ADMIN_PASSWORD);
    if (!valid) return json({error:'密码不正确。'},401);
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'auth_version'").first();
    const payload = `${Date.now()+12*3600000}.${row?.value || '0'}`;
    return json({token:`${payload}.${await signature(env,payload)}`});
  }
  if (!await authorized(request,env)) return json({error:'登录已过期，请重新登录。'},401);
  if (path === '/admin/catalog' && request.method === 'PUT') {
    if (!Array.isArray(data.songs) || data.songs.length > 2000 || data.songs.some(s=>!Number.isSafeInteger(s.id) || typeof s.title !== 'string' || !s.title.trim() || s.title.length>120 || typeof s.artist !== 'string' || !s.artist.trim() || s.artist.length>120 || !['原创','流行','R&B','欧美'].includes(s.style) || typeof s.enabled !== 'boolean') || new Set(data.songs.map(s=>s.id)).size !== data.songs.length) return json({error:'请检查歌曲信息。'},400);
    const catalog = {version:crypto.randomUUID(),songs:data.songs.map(s=>({id:s.id,title:s.title.trim(),artist:s.artist.trim(),style:s.style,enabled:s.enabled}))};
    const old = await env.DB.prepare("SELECT value FROM settings WHERE key = 'catalog'").first();
    if (data.version !== (old ? JSON.parse(old.value).version : 'initial')) return json({error:'歌单已被另一台设备更新，请刷新后重试。'},409);
    if (old) {
      const result = await env.DB.prepare("UPDATE settings SET value = ? WHERE key = 'catalog' AND value = ?").bind(JSON.stringify(catalog),old.value).run();
      if (!result.meta.changes) return json({error:'歌单已被更新，请刷新后重试。'},409);
    } else {
      const result = await env.DB.prepare("INSERT OR IGNORE INTO settings (key,value) VALUES ('catalog',?)").bind(JSON.stringify(catalog)).run();
      if (!result.meta.changes) return json({error:'歌单已被更新，请刷新后重试。'},409);
    }
    return json(catalog);
  }
  if (path === '/admin/password' && request.method === 'PUT') {
    if (typeof data.password !== 'string' || data.password.length < 12 || data.password.length > 200) return json({error:'新密码需为 12–200 个字符。'},400);
    const salt = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('password',?)").bind(JSON.stringify({salt,hash:await passwordHash(data.password,salt)})),
      env.DB.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('auth_version',?)").bind(crypto.randomUUID())
    ]);
    return json({ok:true});
  }
  return json({error:'Not found'},404);
}
export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (request.method === 'OPTIONS') return new Response(null, {status:204,headers:cors});
    if (path.startsWith('/admin/')) return adminRoute(request,env,path);
    if (path === '/catalog' && request.method === 'GET') {
      const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'catalog'").first();
      return json(row ? JSON.parse(row.value) : {version:'initial',songs:null});
    }
    if (path !== '/requests') return json({error:'Not found'},404);
    const day = dayOf(new Date());
    if (request.method === 'GET') {
      const {results} = await env.DB.prepare('SELECT payload FROM requests WHERE day = ? ORDER BY created_at ASC LIMIT 500').bind(day).all();
      return json({day,requests:results.map(row => JSON.parse(row.payload))});
    }
    if (request.method !== 'POST') return json({error:'Method not allowed'},405);
    if (request.headers.get('Origin') !== origin) return json({error:'请通过 xixi 的点歌平台提交。'},403);
    if (Number(request.headers.get('Content-Length') || 0) > 10000) return json({error:'点歌内容过长。'},413);
    const raw = await request.text();
    if (raw.length > 10000) return json({error:'点歌内容过长。'},413);
    let data;
    try { data = JSON.parse(raw); } catch { return json({error:'点歌格式不正确。'},400); }
    if (typeof data.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(data.id) ||
        typeof data.nickname !== 'string' || data.nickname.length > 40 ||
        typeof data.table !== 'string' || data.table.length > 40 ||
        typeof data.message !== 'string' || data.message.length > 500 ||
        !Array.isArray(data.songs) || !data.songs.length || data.songs.length > 5 ||
        data.songs.some(s => typeof s.title !== 'string' || s.title.length > 120 || typeof s.artist !== 'string' || s.artist.length > 120)) {
      return json({error:'请检查点歌内容，每次最多提交 5 首。'},400);
    }
    const existing = await env.DB.prepare('SELECT id FROM requests WHERE id = ?').bind(data.id).first();
    if (existing) return json({ok:true,day});
    const now = Date.now();
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${day}:${ip}`));
    const client = Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    const createdAt = new Date(now).toISOString();
    const catalogRow = await env.DB.prepare("SELECT value FROM settings WHERE key = 'catalog'").first();
    if (!catalogRow) return json({error:'歌单正在准备，请稍后重试。'},503);
    const catalog = JSON.parse(catalogRow.value).songs;
    const requested = data.songs.map(s=>catalog.find(item=>item.id===s.id && item.enabled));
    if (requested.some(s=>!s) || new Set(requested.map(s=>s.id)).size !== requested.length) return json({error:'歌曲已下架或更新，请刷新歌单后重新选择。'},400);
    const entry = {id:data.id,day,createdAt,nickname:data.nickname.trim() || '一位听众',table:data.table.trim(),message:data.message.trim(),songs:requested.map(s=>({title:s.title,artist:s.artist}))};
    // SQLite executes this single statement atomically, including the rate-limit check.
    const result = await env.DB.prepare(`INSERT OR IGNORE INTO requests (id, day, created_at, client, payload)
      SELECT ?, ?, ?, ?, ? WHERE
      (SELECT COUNT(*) FROM requests WHERE client = ? AND day = ?) < 30
      AND NOT EXISTS (SELECT 1 FROM requests WHERE client = ? AND created_at > ?)`)
      .bind(entry.id,day,createdAt,client,JSON.stringify(entry),client,day,client,new Date(now-10000).toISOString()).run();
    if (!result.meta.changes) return json({error:'点歌太快了，请稍后再试；每天最多提交 30 次。'},429);
    return json({ok:true,day},201);
  },
  async scheduled(_event, env) {
    const cutoff = dayOf(new Date(Date.now() - 7*86400000));
    await env.DB.prepare('DELETE FROM requests WHERE day < ?').bind(cutoff).run();
    await env.DB.prepare('DELETE FROM login_attempts WHERE created_at < ?').bind(Date.now()-86400000).run();
  }
};
