(() => {
  const $ = id => document.getElementById(id), api = (window.XIXI_QUEUE_API || '').replace(/\/$/,'');
  let token = sessionStorage.getItem('xixi-admin-session') || '', catalog = [], version = 'initial', editingId = null;
  const escape = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function call(path, method='GET', body) {
    const response = await fetch(api+path,{method,headers:{'Content-Type':'application/json',...(token ? {Authorization:`Bearer ${token}`} : {})},body:body ? JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
    const data = await response.json();
    if (!response.ok) {
      if (response.status===401) logout();
      throw new Error(data.error || '操作失败，请稍后重试。');
    }
    return data;
  }
  function logout() {
    token='';sessionStorage.removeItem('xixi-admin-session');
    $('editor-panel').hidden=true;$('login-panel').hidden=false;
    $('song-dialog').close();
  }
  async function load() {
    const data = await call('/catalog');
    version=data.version;
    catalog=data.songs || window.XIXI_SONGS.map(s=>({...s,enabled:true}));
    $('login-panel').hidden=true;$('editor-panel').hidden=false;
    render();
  }
  function render() {
    const query=$('admin-search').value.trim().toLowerCase();
    const matches=catalog.filter(s=>(s.title+' '+s.artist).toLowerCase().includes(query));
    $('catalog-count').textContent=`${catalog.length} 首歌曲 · ${catalog.filter(s=>s.enabled).length} 首在架`;
    $('admin-songs').innerHTML=matches.map(s=>`<article class="admin-song ${s.enabled ? '' : 'off'}"><div><strong>${escape(s.title)}</strong><p>${escape(s.artist)} · ${escape(s.style)}${s.enabled ? '' : ' · 已下架'}</p></div><button data-edit="${s.id}">编辑</button></article>`).join('') || '<p>没有找到歌曲。</p>';
    $('admin-songs').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>edit(Number(b.dataset.edit))));
  }
  function edit(id=null) {
    editingId=id;
    $('song-form').reset();
    const song=catalog.find(s=>s.id===id);
    const fields=$('song-form').elements;
    if(song){fields.title.value=song.title;fields.artist.value=song.artist;fields.style.value=song.style;fields.enabled.checked=song.enabled;}
    $('edit-title').textContent=song?'编辑歌曲':'新增歌曲';
    $('edit-status').textContent='';
    $('song-dialog').showModal();
  }
  $('login-form').addEventListener('submit',async e=>{
    e.preventDefault();$('login-button').disabled=true;$('admin-status').textContent='正在登录…';
    try {
      const data=await call('/admin/login','POST',{password:$('login-form').elements.password.value});
      token=data.token;sessionStorage.setItem('xixi-admin-session',token);$('login-form').reset();await load();$('admin-status').textContent='';
    }catch(error){$('admin-status').textContent=error.message;}finally{$('login-button').disabled=false;}
  });
  $('song-form').addEventListener('submit',async e=>{
    e.preventDefault();$('save-song').disabled=true;$('edit-status').textContent='正在保存…';
    const f=$('song-form').elements;
    const id=editingId===null?Math.max(0,...catalog.map(s=>s.id))+1:editingId;
    const updated={id,title:f.title.value.trim(),artist:f.artist.value.trim(),style:f.style.value,enabled:f.enabled.checked};
    const next=editingId===null?[...catalog,updated]:catalog.map(s=>s.id===id?updated:s);
    try {
      const data=await call('/admin/catalog','PUT',{version,songs:next});
      catalog=data.songs;version=data.version;render();$('song-dialog').close();$('admin-status').textContent='已保存，点歌平台会自动更新。';
    }catch(error){$('edit-status').textContent=error.message;}finally{$('save-song').disabled=false;}
  });
  $('password-form').addEventListener('submit',async e=>{
    e.preventDefault();const f=$('password-form').elements;
    if(f.newPassword.value!==f.confirmation.value){$('admin-status').textContent='两次输入的密码不一致。';return;}
    const button=$('password-form').querySelector('button');button.disabled=true;
    try{await call('/admin/password','PUT',{password:f.newPassword.value});$('password-form').reset();logout();$('admin-status').textContent='密码已更新，请使用新密码登录。';}
    catch(error){$('admin-status').textContent=error.message;}finally{button.disabled=false;}
  });
  $('admin-search').addEventListener('input',render);$('add-song').addEventListener('click',()=>edit());$('close-song').addEventListener('click',()=>$('song-dialog').close());$('logout').addEventListener('click',logout);
  if(!api){$('login-button').disabled=true;$('admin-status').textContent='共享管理服务尚未接通，暂时无法登录和编辑。';}
  else if(token)load().catch(error=>{$('admin-status').textContent=error.message;logout();});
})();
