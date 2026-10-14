const V='agridiam-v9';
const SHELL=['/','/index.html','/caisse.html','/stock.html','/transport.html','/agri.js','/auth.js','/cloud.js','/config.js','/manifest.webmanifest','/manifest-caisse.webmanifest','/manifest-stock.webmanifest','/manifest-transport.webmanifest','/icon-192.png','/icon-512.png','/icon-maskable-512.png','/apple-touch-icon.png'];
const CDN=['https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js','https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(async c=>{
    await Promise.all(SHELL.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})));
    await Promise.all(CDN.map(u=>fetch(u,{mode:'no-cors'}).then(r=>c.put(u,r)).catch(()=>{})));
  }).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.origin!==location.origin){
    if(CDN.indexOf(r.url)>-1){e.respondWith(caches.match(r.url).then(m=>m||fetch(r)));}
    return;
  }
  e.respondWith(
    fetch(r).then(res=>{
      if(res&&res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp)).catch(()=>{});}
      return res;
    }).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||(r.mode==='navigate'?caches.match('/index.html'):undefined)))
  );
});
