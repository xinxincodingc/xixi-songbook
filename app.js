(() => {
  'use strict';
  const songs = window.XIXI_SONGS;
  const $ = id => document.getElementById(id);
  const pageSize = 10;
  let mode = 'style', filter = '全部', query = '', page = 0, toastTimer;
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
  function requestText() {
    const data = new FormData($('request-form'));
    const name = String(data.get('nickname') || '').trim() || '一位听众';
    const table = String(data.get('table') || '').trim() || '未填写';
    const message = String(data.get('message') || '').trim() || '无';
    const picked = songs.filter(s => selected.has(s.id));
    return `Hi xixi，今晚想听这些歌：\n\n${picked.map((s,i) => `${i+1}. ${s.title} — ${s.artist}`).join('\n')}\n\n昵称：${name}\n桌号 / 位置：${table}\n留言：${message}\n\n来自 xixi 线上点歌本`;
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
  $('request-form').addEventListener('submit', e => {
    e.preventDefault();
    if (!selected.size) return;
    const subject = `给 xixi 的点歌 · ${songs.filter(s => selected.has(s.id)).map(s => s.title).join('、')}`;
    const link = document.createElement('a');
    link.href = `mailto:cwx0516@outlook.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(requestText())}`;
    link.click();
    $('form-status').textContent = '请在邮箱应用中点击发送。若邮箱没有打开，可以复制点歌内容，手动发到上方邮箱。';
  });
  $('copy-request').addEventListener('click', async () => {
    if (!selected.size) return;
    const text = requestText();
    try {
      await navigator.clipboard.writeText(text);
      $('form-status').textContent = '点歌内容已复制，请粘贴到邮件中发送给 xixi。';
    } catch {
      const area = document.createElement('textarea');
      area.value = text; $('request-form').appendChild(area); area.focus(); area.select();
      const copied = document.execCommand('copy'); area.remove();
      $('form-status').textContent = copied ? '点歌内容已复制，请粘贴到邮件中发送。' : '浏览器无法自动复制，请手动复制以下内容：';
      if (!copied) { const pre = document.createElement('pre'); pre.style.whiteSpace = 'pre-wrap'; pre.textContent = text; $('form-status').appendChild(pre); }
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName) && !$('request-dialog').open) {
      e.preventDefault(); $('search').focus(); $('songbook').scrollIntoView();
    }
  });
  $('year').textContent = new Date().getFullYear();
  renderFilters(); renderSongs(); renderOriginals(); renderSelection();
})();
