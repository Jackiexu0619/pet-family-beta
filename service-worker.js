const CACHE='wordloop-family-v0.5.10.7';
const ASSETS=['./index.html','./manifest.webmanifest'];

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

  // WordLoop Family API 已在 index.html 中显式走阿里云香港 relay。
  // 跨域请求和非 GET 请求不进入缓存逻辑。
  if(url.origin!==self.location.origin || e.request.method!=='GET') return;

  if(e.request.mode==='navigate'){
    e.respondWith(
      fetch(e.request)
        .then(r=>{
          const copy=r.clone();
          caches.open(CACHE).then(c=>c.put('./index.html',copy)).catch(()=>{});
          return r;
        })
        .catch(async()=>{
          const cached=await caches.match('./index.html');
          return cached || Response.error();
        })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached=>cached||fetch(e.request))
  );
});
