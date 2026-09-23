const CACHE='pet-family-beta-0.2.1-relay';
const ASSETS=['./index.html','./manifest.webmanifest'];

const SUPABASE_ORIGIN='https://zzbiowklurwnbyhpkqbs.supabase.co';
const RELAY_URL='https://petrelay-zaaoootqax.cn-hongkong.fcapp.run/relay';

async function relaySupabaseRequest(req){
  const u=new URL(req.url);
  const target=u.pathname+u.search;
  const relay=RELAY_URL+'?target='+encodeURIComponent(target);

  const headers=new Headers();
  [
    'apikey',
    'authorization',
    'content-type',
    'accept',
    'prefer',
    'x-client-info',
    'range',
    'accept-profile',
    'content-profile'
  ].forEach(name=>{
    const value=req.headers.get(name);
    if(value) headers.set(name,value);
  });

  const init={
    method:req.method,
    headers,
    mode:'cors',
    cache:'no-store',
    redirect:'follow'
  };

  if(req.method!=='GET' && req.method!=='HEAD'){
    init.body=await req.clone().arrayBuffer();
  }

  return fetch(relay,init);
}

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});

self.addEventListener('activate',e=>e.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
));

self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);

  // Family Beta 原有 Supabase 请求透明改道到阿里云香港中转。
  if(url.origin===SUPABASE_ORIGIN){
    e.respondWith(relaySupabaseRequest(e.request));
    return;
  }

  // 跨域请求及非 GET 请求不要再交给缓存逻辑处理。
  if(url.origin!==self.location.origin || e.request.method!=='GET') return;

  if(e.request.mode==='navigate'){
    e.respondWith(
      fetch(e.request)
        .then(r=>{
          const copy=r.clone();
          caches.open(CACHE).then(c=>c.put('./index.html',copy)).catch(()=>{});
          return r;
        })
        .catch(()=>caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(r=>r||fetch(e.request))
  );
});
