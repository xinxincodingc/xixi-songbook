const origin = 'https://xinxincodingc.github.io';
const dayOf = date => new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const cors = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Cache-Control':'no-store'};
const json = (data, status = 200) => new Response(JSON.stringify(data), {status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}});
export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (request.method === 'OPTIONS') return new Response(null, {status:204,headers:cors});
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
    const entry = {id:data.id,day,createdAt,nickname:data.nickname.trim() || '一位听众',table:data.table.trim(),message:data.message.trim(),songs:data.songs.map(s=>({title:s.title,artist:s.artist}))};
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
  }
};
