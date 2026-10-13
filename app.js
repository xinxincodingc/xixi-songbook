(() => {
  'use strict';
  const songs = window.XIXI_SONGS;
  const $ = id => document.getElementById(id);
  const pageSize = 10;
  let mode = 'style', filter = '全部', query = '', page = 0, toastTimer;
  const queueApi = (window.XIXI_QUEUE_API || '').replace(/\/$/, '');
  const dayOf = date => new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Shanghai', year:'numeric', month:'2-digit', day:'2-digit'}).format(date);
  let queueDay = dayOf(new Date()), queueEntries = [], loadingQueue = false, submissionId = null;
  let stored = [];
  try { stored = JSON.parse(localStorage.getItem('xixi-selection') || '[]'); } catch {}
  const selected = new Set(Array.isArray(stored) ? stored.filter(id => songs.some(s => s.id === id)) : []);
  const styleLabels = {全部:'ALL TRACKS',原创:'ORIGINALS',流行:'POP','R&B':'RHYTHM & BLUES',欧美:'WESTERN'};
  const escaped = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function showToast(message) {
    $('toast').textContent = message;
    $('toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2800);
  }
  function renderFilters() {
    const values = mode === 'style' ? Object.keys(styleLabels) : ['全部', 'xixi', ...[...new Set(songs.map(s => s.artist))].filter(a => a !== 'xixi' && a !== '原唱待确认').sort((a,b) => a.localeCompare(b,'zh-CN')), '原唱待确认'];
    $('filters').innerHTML = values.map(value => {
      const count = value === '全部' ? songs.length : songs.filter(s => s[mode] === value || (mode === 'artist' && s.artist === value)).length;
      return `<button class="filter ${filter === value ? 'selected' : ''}" data-value="${escaped(value)}" aria-pressed="${filter === value}"><span>${escaped(value)}${mode === 'style' ? `<small class="en">${styleLabels[value]}</small>` : ''}</span><span>${String(count).padStart(2,'0')}</span></button>`;
    }).join('');
    $('filters').querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      filter = button.dataset.value; page = 0; renderFilters(); renderSongs();
    }));
  }
  function matchingSongs() {
    return songs.filter(s => {
      const matchesFilter = filter === '全部' || (mode === 'style' ? s.style : s.artist) === filter;
      const searchable = `${s.title} ${s.artist} ${s.style}`.toLocaleLowerCase().replace(/['’\s]/g,'');
      return matchesFilter && searchable.includes(query.toLocaleLowerCase().replace(/['’\s]/g,''));
    });
  }
  function renderSongs() {
    const results = matchingSongs();
    const pages = Math.max(1, Math.ceil(results.length / pageSize));
    page = Math.min(page, pages - 1);
    $('result-count').textContent = `${results.length} 首歌曲`;
    $('song-list').innerHTML = results.slice(page * pageSize, (page + 1) * pageSize).map((s,i) => `<div class="song-row"><div class="track-title"><span class="track-number">${String(page * pageSize + i + 1).padStart(2,'0')}</span><span class="track-text" title="${escaped(s.title)}">${escaped(s.title)}</span></div><span class="artist-name" title="${escaped(s.artist)}">${escaped(s.artist)}</span><span class="genre ${s.style === '原创' ? 'genre-original' : ''}">${escaped(s.style)}</span><button class="request-button ${selected.has(s.id) ? 'chosen' : ''}" data-song="${s.id}" aria-label="${selected.has(s.id) ? '取消' : '点歌'} ${escaped(s.title)}" aria-pressed="${selected.has(s.id)}">${selected.has(s.id) ? '✓' : '+'}</button></div>`).join('') || '<div class="empty-state">还没找到这首歌。<br>试试搜索其他歌名或原唱歌手。</div>';
    $('page-info').textContent = `${String(page + 1).padStart(2,'0')} / ${String(pages).padStart(2,'0')} · ${filter === '全部' ? '全部曲目' : filter}`;
    $('prev-page').disabled = page === 0;
    $('next-page').disabled = page === pages - 1;
    bindSongButtons($('song-list'));
  }
  function bindSongButtons(container) {
    container.querySelectorAll('[data-song]').forEach(button => button.addEventListener('click', () => toggleSong(Number(button.dataset.song))));
  }
  function toggleSong(id) {
    const song = songs.find(s => s.id === id);
    if (!song) return;
    if (selected.has(id)) selected.delete(id);
    else {
      if (selected.size >= 5) { showToast('一次最多选 5 首，把机会也留给其他听众。'); return; }
      selected.add(id);
      showToast(`已加入「${song.title}」`);
    }
    try { localStorage.setItem('xixi-selection', JSON.stringify([...selected])); } catch {}
    renderSongs(); renderOriginals(); renderSelection();
    if ($('request-dialog').open && !selected.size) $('request-dialog').close();
  }
  function renderOriginals() {
    const palette = [['#713b48','#f7e5d9'],['#60736e','#ececdd'],['#bfaa94','#342d2c'],['#303b4a','#eee4cf'],['#9c6556','#f4e5d1'],['#b4b59f','#3f4740']];
    $('original-grid').innerHTML = songs.filter(s => s.style === '原创').map((s,i) => `<article class="original-card"><div class="mini-sleeve" style="--sleeve:${palette[i][0]};--cover-ink:${palette[i][1]}"><span class="cover-title">${escaped(s.title)}</span><span class="cover-star">${['✳','✧','○','☾','✶','⊕'][i]}</span><span class="cover-no">XIXI / SINGLE 0${i+1}</span></div><div class="original-meta"><strong>${escaped(s.title)}</strong><button class="${selected.has(s.id) ? 'chosen' : ''}" data-song="${s.id}" aria-label="${selected.has(s.id) ? '取消' : '点歌'} ${escaped(s.title)}" aria-pressed="${selected.has(s.id)}">${selected.has(s.id) ? '✓' : '+'}</button></div><p>ORIGINAL BY XIXI</p></article>`).join('');
    bindSongButtons($('original-grid'));
  }
  function renderSelection() {
    const picked = songs.filter(s => selected.has(s.id));
    $('request-bar').hidden = !picked.length;
    document.body.classList.toggle('has-selection', Boolean(picked.length));
    $('selection-summary').textContent = `${picked.length} 首 · ${picked.map(s => s.title).join('、')}`;
    $('selected-songs').innerHTML = picked.map(s => `<span class="selected-chip">${escaped(s.title)}<button data-song="${s.id}" aria-label="移除 ${escaped(s.title)}">×</button></span>`).join('');
    bindSongButtons($('selected-songs'));
  }
  function changeMode(nextMode) {
    mode = nextMode; filter = '全部'; page = 0;
    ['style','artist'].forEach(name => {
      $(`${name}-tab`).classList.toggle('selected', mode === name);
      $(`${name}-tab`).setAttribute('aria-selected', String(mode === name));
    });
    renderFilters(); renderSongs();
  }
  function renderQueue() {
    $('queue-date').textContent = queueDay.replaceAll('-', ' / ');
    $('queue-count').textContent = `${queueEntries.reduce((total, item) => total + item.songs.length, 0)} 首点歌`;
    $('today-list').innerHTML = queueEntries.map(item => `<article class="queue-item"><div class="queue-item-head"><strong>${escaped(item.nickname || '一位听众')}</strong><span>${escaped(item.table || '')}</span><time>${new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(item.createdAt))}</time></div><div class="queue-tracks">${item.songs.map(s => `<p>${escaped(s.title)} <small>${escaped(s.artist)}</small></p>`).join('')}</div>${item.message ? `<p class="queue-message">${escaped(item.message)}</p>` : ''}</article>`).join('') || `<div class="queue-empty"><span>◎</span><h3>今天的第一首，会是什么？</h3><p>${queueApi ? '选一首喜欢的歌，留在今日点歌单。' : '在这台设备上选择歌曲，即可查看今日记录。'}</p><a href="#songbook">去点一首 ↗</a></div>`;
  }
  async function queueFetch(path, options = {}) {
    const response = await fetch(`${queueApi}${path}`, {...options, signal:AbortSignal.timeout(12000)});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '点歌服务暂时无法连接，请稍后重试。');
    return data;
  }
  async function loadQueue() {
    if (loadingQueue) return;
    loadingQueue = true;
    queueDay = dayOf(new Date());
    $('refresh-queue').disabled = true;
    try {
      if (queueApi) {
        $('queue-status').textContent = '正在更新今日点歌…';
        const data = await queueFetch('/requests');
        queueDay = data.day;
        queueEntries = data.requests;
        $('queue-status').textContent = '今日点歌实时共享 · 每 15 秒更新';
      } else {
        const all = JSON.parse(localStorage.getItem('xixi-daily-requests') || '[]');
        queueEntries = all.filter(item => item.day === queueDay);
        $('queue-status').textContent = '当前仅保存于这台设备，其他访客和 xixi 的设备暂时看不到；共享点歌尚未接通。';
      }
      renderQueue();
    } catch {
      $('queue-status').textContent = queueApi ? '点歌单更新失败，请点击刷新重试。' : '浏览器无法读取本机记录，请允许网站存储后重试。';
    } finally {
      loadingQueue = false;
      $('refresh-queue').disabled = false;
    }
  }
  $('style-tab').addEventListener('click', () => changeMode('style'));
  $('artist-tab').addEventListener('click', () => changeMode('artist'));
  $('search').addEventListener('input', e => { query = e.target.value.trim(); page = 0; renderSongs(); });
  $('prev-page').addEventListener('click', () => { page--; renderSongs(); });
  $('next-page').addEventListener('click', () => { page++; renderSongs(); });
  $('random-song').addEventListener('click', () => {
    const available = matchingSongs().filter(s => !selected.has(s.id));
    if (!available.length) { showToast('这个分类的歌曲已经都在点歌单里了。'); return; }
    toggleSong(available[Math.floor(Math.random() * available.length)].id);
  });
  $('spin-toggle').addEventListener('click', () => {
    const paused = $('vinyl').classList.toggle('paused');
    $('spin-toggle').textContent = paused ? '▷' : 'Ⅱ';
    $('spin-toggle').setAttribute('aria-label', paused ? '继续黑胶旋转' : '暂停黑胶旋转');
    $('spin-toggle').setAttribute('aria-pressed', String(paused));
  });
  $('open-request').addEventListener('click', () => {
    $('form-status').textContent = '';
    $('request-dialog').showModal();
  });
  $('close-dialog').addEventListener('click', () => $('request-dialog').close());
  $('request-dialog').addEventListener('click', e => {
    const rect = $('request-dialog').getBoundingClientRect();
    if (e.target === $('request-dialog') && (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)) $('request-dialog').close();
  });
  $('request-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (!selected.size || $('submit-request').disabled) return;
    const fields = new FormData($('request-form'));
    submissionId ||= crypto.randomUUID();
    const entry = {
      id:submissionId, day:dayOf(new Date()), createdAt:new Date().toISOString(),
      nickname:String(fields.get('nickname') || '').trim() || '一位听众',
      table:String(fields.get('table') || '').trim(), message:String(fields.get('message') || '').trim(),
      songs:songs.filter(s => selected.has(s.id)).map(s => ({id:s.id,title:s.title,artist:s.artist}))
    };
    $('submit-request').disabled = true;
    $('form-status').textContent = '正在加入点歌单…';
    try {
      if (queueApi) await queueFetch('/requests', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(entry)});
      else {
        const all = JSON.parse(localStorage.getItem('xixi-daily-requests') || '[]').filter(item => item.day === entry.day);
        if (!all.some(item => item.id === entry.id)) all.push(entry);
        localStorage.setItem('xixi-daily-requests', JSON.stringify(all));
      }
      submissionId = null;
      selected.clear();
      try { localStorage.removeItem('xixi-selection'); } catch {}
      renderSongs(); renderOriginals(); renderSelection();
      $('request-form').reset(); $('request-dialog').close();
      await loadQueue();
      $('today').scrollIntoView({behavior:'smooth'});
      showToast(queueApi ? '已加入今日点歌单' : '已保存到本机今日记录，尚未同步给 xixi');
    } catch (error) {
      $('form-status').textContent = queueApi ? error.message : '无法保存点歌，请允许浏览器存储后重试。';
    } finally {
      $('submit-request').disabled = false;
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName) && !$('request-dialog').open) {
      e.preventDefault(); $('search').focus(); $('songbook').scrollIntoView();
    }
  });
  $('year').textContent = new Date().getFullYear();
  $('delivery-note').textContent = queueApi ? '歌曲、昵称、桌号和留言会公开显示在今日点歌单中。' : '当前为本机记录：歌曲只显示在这台设备上，不会同步给 xixi。共享点歌服务尚未接通。';
  $('refresh-queue').addEventListener('click', loadQueue);
  window.addEventListener('storage', event => { if (event.key === 'xixi-daily-requests') loadQueue(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadQueue(); });
  setInterval(() => { if (!document.hidden && (queueApi || queueDay !== dayOf(new Date()))) loadQueue(); }, 15000);
  loadQueue();
  renderFilters(); renderSongs(); renderOriginals(); renderSelection();
})();
