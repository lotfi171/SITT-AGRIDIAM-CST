(function () {
  if (window.__agri) return;
  window.__agri = 1;

  var MOD = (location.pathname.split('/').pop() || 'index').replace(/\.html$/, '') || 'index';
  var NAMES = { caisse: 'Caisse+', stock: 'Stock+', transport: 'Transport', suivi: 'Suivi versements', index: 'Menu' };
  var NAVY = '#1F3864';

  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  function toast(t, ms) {
    var n = el('<div class="agrt">' + esc(t) + '</div>');
    document.body.appendChild(n);
    setTimeout(function () { n.remove(); }, ms || 3500);
  }

  /* ---------- Styles ---------- */
  var css = '' +
    '#agrbar{position:fixed;left:104px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:60;display:flex;gap:6px}' +
    '#agrbar button{border:0;border-radius:6px;padding:8px 12px;cursor:pointer;font:13px Arial,sans-serif;background:' + NAVY + ';color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.3)}' +
    '.agro{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:150;display:flex;align-items:flex-start;justify-content:center;overflow:auto;font-family:Arial,sans-serif}' +
    '.agrp{background:#fff;color:#1b2333;width:min(760px,96vw);margin:12px auto;border-radius:8px;overflow:hidden}' +
    '.agrh{background:' + NAVY + ';color:#fff;padding:10px 14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}' +
    '.agrh b{flex:1;font-size:15px}' +
    '.agrb{padding:12px 14px}' +
    '.agrp button,.agrv button{font:13px Arial,sans-serif;border:1px solid ' + NAVY + ';background:#fff;color:' + NAVY + ';border-radius:5px;padding:7px 11px;cursor:pointer}' +
    '.agrp button.pri,.agrv button.pri{background:' + NAVY + ';color:#fff}' +
    '.agrh button{border-color:#fff!important}' +
    '.agrp input[type=text],.agrp input[type=search]{font:14px Arial,sans-serif;padding:8px;border:1px solid #b9c1d0;border-radius:5px;width:100%;box-sizing:border-box}' +
    '.agrrow{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}' +
    '.agri{display:flex;gap:10px;align-items:center;border:1px solid #d5dae3;border-radius:6px;padding:8px;margin:8px 0}' +
    '.agri .th{width:64px;height:64px;object-fit:cover;border-radius:4px;background:#eef1f6;display:flex;align-items:center;justify-content:center;font-size:26px;flex:none}' +
    '.agri .tx{flex:1;min-width:0}.agri .tx b{display:block;overflow:hidden;text-overflow:ellipsis}.agri .tx small{color:#6b7690}' +
    '.agri .ac{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}' +
    '.agrv{position:fixed;inset:0;background:#222;z-index:200;display:flex;flex-direction:column;font-family:Arial,sans-serif}' +
    '.agrv .bar{background:' + NAVY + ';color:#fff;padding:8px 12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.agrv .bar b{flex:1}' +
    '.agrv .bar button{border-color:#fff}' +
    '.agrv .bd{flex:1;overflow:auto;text-align:center}' +
    '.agrv img{max-width:100%;cursor:zoom-in}.agrv img.z{max-width:none;cursor:zoom-out}' +
    '.agrv iframe{width:100%;height:100%;border:0;background:#fff}' +
    '.agrt{position:fixed;left:50%;bottom:70px;max-width:90vw;text-align:center;transform:translateX(-50%);background:#222;color:#fff;padding:9px 14px;border-radius:6px;z-index:300;font:13px Arial,sans-serif}' +
    '@page{size:A4;margin:10mm}' +
    '@media print{#agrbar,#agrmenu,#bk,#bkt,.agro,.agrv,.agrt,nav,button,.tools,.no{display:none!important}' +
    'body:not(.pp){background:#fff!important}.wrap,.panel{max-height:none!important;overflow:visible!important}' +
    'table{font-size:11px}tr{page-break-inside:avoid}thead{display:table-header-group}}';
  var stl = document.createElement('style');
  stl.textContent = css;
  document.head.appendChild(stl);

  /* ---------- Impression fiable ---------- */
  window.agriReady = function (root, cb) {
    var imgs = [].slice.call((root || document).querySelectorAll('img')).filter(function (i) { return !i.complete; });
    var done = false;
    function go() { if (done) return; done = true; setTimeout(cb, 200); }
    if (!imgs.length) return go();
    var n = imgs.length;
    imgs.forEach(function (i) {
      function d() { if (--n <= 0) go(); }
      i.addEventListener('load', d);
      i.addEventListener('error', d);
    });
    setTimeout(go, 3000);
  };

  window.addEventListener('afterprint', function () {
    setTimeout(function () { document.body.classList.remove('pp'); }, 500);
  });

  window.agriPrintScreen = function () {
    document.body.classList.remove('pp');
    window.agriReady(document, function () { window.print(); });
  };

  window.agriPrintHTML = function (html, fr) {
    var inj = '<script>addEventListener("load",function(){setTimeout(function(){print()},500)})</script>';
    var h = html.indexOf('</body>') > -1 ? html.replace('</body>', inj + '</body>') : html + inj;
    var url = URL.createObjectURL(new Blob([h], { type: 'text/html;charset=utf-8' }));
    var w = null;
    try { w = window.open(url, '_blank'); } catch (e) { }
    if (!w) {
      try { fr.contentWindow.focus(); fr.contentWindow.print(); }
      catch (e) { toast("Impression bloquée : autorise les pop-up pour ce site ou utilise « Télécharger »."); }
    }
    setTimeout(function () { URL.revokeObjectURL(url); }, 120000);
  };

  /* ---------- Base des scans (IndexedDB) ---------- */
  var dbp;
  function db() {
    return dbp || (dbp = new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('IndexedDB indisponible'));
      var q = indexedDB.open('agridiam-scans-v1', 1);
      q.onupgradeneeded = function () { q.result.createObjectStore('scans', { keyPath: 'id' }); };
      q.onsuccess = function () { res(q.result); };
      q.onerror = function () { rej(q.error); };
    }));
  }
  function tx(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction('scans', mode), r = fn(t.objectStore('scans'));
        t.oncomplete = function () { res(r && r.result); };
        t.onerror = function () { rej(t.error); };
        t.onabort = function () { rej(t.error); };
      });
    });
  }
  function CL() { return !!(window.agriCloud && window.agriCloud.enabled); }
  var dbAllLocal = function () { return tx('readonly', function (s) { return s.getAll(); }); };
  var dbAll = function () { return CL() ? window.agriCloud.scans.list(MOD, true) : dbAllLocal(); };
  var dbPut = function (o) { return tx('readwrite', function (s) { return s.put(o); }); };
  var dbDel = function (id) { return tx('readwrite', function (s) { return s.delete(id); }); };

  function prep(f) {
    return new Promise(function (res) {
      if (!/^image\//.test(f.type) || /gif|svg/.test(f.type)) return res(f);
      var u = URL.createObjectURL(f), im = new Image();
      im.onload = function () {
        var M = 2000, w = im.naturalWidth, h = im.naturalHeight, k = Math.min(1, M / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.round(w * k); c.height = Math.round(h * k);
        var x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
        x.drawImage(im, 0, 0, c.width, c.height);
        c.toBlob(function (b) { URL.revokeObjectURL(u); res(b && b.size < f.size ? b : f); }, 'image/jpeg', 0.82);
      };
      im.onerror = function () { URL.revokeObjectURL(u); res(f); };
      im.src = u;
    });
  }
  function fmtSize(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' Mo' : Math.max(1, Math.round(n / 1024)) + ' Ko'; }
  function fmtDate(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
  function download(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }

  /* ---------- Visionneuse ---------- */
  function view(r) {
    var url = URL.createObjectURL(r.blob), isPdf = /pdf/.test(r.type);
    var v = el('<div class="agrv"><div class="bar"><b>' + esc(r.label || r.name) + '</b>' +
      '<button data-a="p" class="pri">🖨️ Imprimer</button><button data-a="d">⬇️ Télécharger</button>' +
      '<button data-a="o">↗ Ouvrir</button><button data-a="x">✕ Fermer</button></div><div class="bd"></div></div>');
    var bd = $('.bd', v);
    if (isPdf) { bd.innerHTML = '<iframe src="' + url + '"></iframe>'; }
    else {
      var im = new Image(); im.src = url; im.alt = '';
      im.onclick = function () { im.classList.toggle('z'); };
      bd.appendChild(im);
    }
    function close() { URL.revokeObjectURL(url); v.remove(); }
    v.addEventListener('click', function (e) {
      var a = e.target.getAttribute && e.target.getAttribute('data-a');
      if (a === 'x') close();
      if (a === 'd') download(r.blob, r.name || 'scan');
      if (a === 'o') window.open(url, '_blank');
      if (a === 'p') {
        if (isPdf) { window.open(url, '_blank'); toast("Le PDF s'ouvre dans un nouvel onglet : lance l'impression depuis cet onglet."); }
        else window.agriPrintHTML('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(r.label || r.name) + '</title><style>@page{size:A4;margin:10mm}body{margin:0}img{max-width:100%;max-height:277mm;display:block;margin:0 auto}</style></head><body><img src="' + url + '"></body></html>', null);
      }
    });
    document.body.appendChild(v);
  }

  /* ---------- Panneau des scans ---------- */
  var urls = [];
  function openPanel(pre) {
    pre = typeof pre === 'string' ? pre : '';
    var all = false, q = pre.toLowerCase();
    var o = el('<div class="agro"><div class="agrp"><div class="agrh"><b>📎 Scans — ' + esc(NAMES[MOD] || MOD) + '</b><button data-a="x">✕ Fermer</button></div><div class="agrb">' +
      '<input type="text" id="agrl" placeholder="Référence du scan (ex. chèque n° 123, facture, bon de sortie…)">' +
      '<div class="agrrow"><button class="pri" data-a="cam">📷 Prendre une photo</button><button class="pri" data-a="fil">📁 Choisir un fichier (image ou PDF)</button></div>' +
      '<input type="file" id="agrc" accept="image/*" capture="environment" hidden>' +
      '<input type="file" id="agrf" accept="image/*,application/pdf" multiple hidden>' +
      '<div class="agrrow"><input type="search" id="agrq" placeholder="Rechercher un scan" style="flex:1"><label style="font-size:13px;display:flex;align-items:center;gap:5px"><input type="checkbox" id="agra"> Tous les modules</label></div>' +
      '<div id="agrlist"></div>' +
      '<div class="agrrow"><button data-a="exp">Sauvegarder les scans (fichier)</button><button data-a="imp">Restaurer</button><input type="file" id="agri" accept=".json" hidden></div>' +
      '<p style="font-size:12px;color:#6b7690;margin:6px 0 0">' + (CL() ? 'Les scans sont enregistrés en ligne et visibles par les utilisateurs autorisés.' : 'Les scans restent dans ce navigateur, sur cet appareil. Fais une sauvegarde de temps en temps.') + '</p>' +
      '</div></div></div>');
    document.body.appendChild(o);
    if (pre) { $('#agrl', o).value = pre; $('#agrq', o).value = pre; }
    if (CL()) { var xb = $('[data-a=exp]', o); if (xb && xb.parentNode) xb.parentNode.style.display = 'none'; }

    function render() {
      dbAll().then(function (rows) {
        urls.forEach(function (u) { URL.revokeObjectURL(u); }); urls = [];
        rows = rows.filter(function (r) { return (all || r.mod === MOD) && (!q || ((r.label || '') + ' ' + (r.name || '')).toLowerCase().indexOf(q) > -1); })
          .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
        $('#agrlist', o).innerHTML = rows.length ? rows.map(function (r) {
          var th;
          if (/^image\//.test(r.type) && r.blob) { var u = URL.createObjectURL(r.blob); urls.push(u); th = '<img class="th" src="' + u + '" alt="">'; }
          else th = '<div class="th">' + (/^image\//.test(r.type) ? '🖼️' : '📄') + '</div>';
          return '<div class="agri" data-id="' + r.id + '">' + th + '<div class="tx"><b>' + esc(r.label || r.name) + '</b><small>' + fmtDate(r.date) + ' · ' + fmtSize(r.size) + (all ? ' · ' + esc(NAMES[r.mod] || r.mod) : '') + '</small></div>' +
            '<div class="ac"><button class="pri" data-a="v">Voir</button><button data-a="dl">⬇️</button>' + (CL() && window.agriCloud.role() !== 'admin' ? '' : '<button data-a="del">Supprimer</button>') + '</div></div>';
        }).join('') : '<p style="color:#6b7690;text-align:center;padding:14px">Aucun scan pour le moment.</p>';
      }).catch(function () { $('#agrlist', o).innerHTML = '<p style="color:#b3261e">Les scans ne sont pas disponibles dans ce navigateur (navigation privée ?).</p>'; });
    }

    function addFiles(files) {
      var lab = $('#agrl', o).value.trim();
      var list = [].slice.call(files);
      if (!list.length) return;
      var chain = Promise.resolve(), n = 0;
      list.forEach(function (f) {
        chain = chain.then(function () {
          if (!/^image\//.test(f.type) && !/pdf/.test(f.type)) { toast('Format non pris en charge : ' + f.name); return; }
          if (f.size > 15 * 1048576) { toast('Fichier trop lourd (15 Mo max) : ' + f.name); return; }
          return prep(f).then(function (b) {
            var nm = f.name || ('scan-' + Date.now() + '.jpg');
            if (b !== f && /^image\//.test(b.type)) nm = nm.replace(/\.[a-z0-9]+$/i, '') + '.jpg';
            return (CL() ? window.agriCloud.scans.add(b, { mod: MOD, label: lab, name: nm }) : dbPut({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), mod: MOD, label: lab, date: new Date().toISOString(), name: nm, type: b.type || f.type, size: b.size, blob: b })).then(function () { n++; });
          });
        });
      });
      chain.then(function () { if (n) { toast(n + ' scan(s) enregistré(s).'); $('#agrl', o).value = ''; } render(); })
        .catch(function () { toast(CL() ? "Enregistrement impossible (droits insuffisants ou pas de connexion)." : "Enregistrement impossible (espace insuffisant ou navigation privée)."); render(); });
    }

    $('#agrc', o).onchange = function (e) { addFiles(e.target.files); e.target.value = ''; };
    $('#agrf', o).onchange = function (e) { addFiles(e.target.files); e.target.value = ''; };
    $('#agrq', o).oninput = function (e) { q = e.target.value.trim().toLowerCase(); render(); };
    $('#agra', o).onchange = function (e) { all = e.target.checked; render(); };
    $('#agri', o).onchange = function (e) {
      var f = e.target.files[0]; e.target.value = ''; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var d = JSON.parse(fr.result); if (!d.scans) throw 0;
          var chain = Promise.resolve();
          d.scans.forEach(function (s) {
            chain = chain.then(function () { return fetch(s.data).then(function (r) { return r.blob(); }).then(function (b) { delete s.data; s.blob = b; return dbPut(s); }); });
          });
          chain.then(function () { toast(d.scans.length + ' scan(s) restauré(s).'); render(); });
        } catch (x) { toast('Fichier de sauvegarde non valide.'); }
      };
      fr.readAsText(f);
    };

    o.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-a]') : null; if (!b) { if (e.target === o) b = null; return; }
      var a = b.getAttribute('data-a'), card = b.closest('.agri'), id = card && card.getAttribute('data-id');
      if (a === 'x') { urls.forEach(function (u) { URL.revokeObjectURL(u); }); urls = []; o.remove(); }
      if (a === 'cam') $('#agrc', o).click();
      if (a === 'fil') $('#agrf', o).click();
      if (a === 'imp') $('#agri', o).click();
      if (a === 'exp') {
        dbAll().then(function (rows) {
          return Promise.all(rows.map(function (r) {
            return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { var c = Object.assign({}, r); c.data = fr.result; delete c.blob; res(c); }; fr.readAsDataURL(r.blob); });
          }));
        }).then(function (list) {
          if (!list.length) { toast('Aucun scan à sauvegarder.'); return; }
          download(new Blob([JSON.stringify({ v: 1, scans: list })], { type: 'application/json' }), 'scans_agridiam_' + new Date().toISOString().slice(0, 10) + '.json');
        });
      }
      if (id) {
        dbAll().then(function (rows) {
          var r = rows.filter(function (x) { return x.id === id; })[0]; if (!r) return;
          var getB = function () { return r.blob ? Promise.resolve(r.blob) : window.agriCloud.scans.blob(r); };
          if (a === 'v') getB().then(function (bl) { view(Object.assign({}, r, { blob: bl })); }).catch(function () { toast('Impossible de charger ce scan.'); });
          if (a === 'dl') getB().then(function (bl) { download(bl, r.name || 'scan'); }).catch(function () { toast('Impossible de charger ce scan.'); });
          if (a === 'del' && confirm('Supprimer ce scan ?')) (CL() ? window.agriCloud.scans.del(r) : dbDel(id)).then(render, function () { toast('Suppression refusée.'); });
        });
      }
    });
    render();
  }

  /* ---------- Barre de boutons ---------- */
  function bar() {
    if ($('#agrbar')) return;
    var b = el('<div id="agrbar"><button id="agrbs">📎 Scans</button>' + (MOD === 'index' ? '' : '<button id="agrbp">🖨️ Imprimer</button>') + '</div>');
    document.body.appendChild(b);
    $('#agrbs').onclick = function () { openPanel(); };
    window.agriScansPanel = openPanel;
    var p = $('#agrbp'); if (p) p.onclick = window.agriPrintScreen;
  }
  /* ---------- Installation comme une appli ---------- */
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  var dp = null;
  function addBtn(id, label, fn) {
    bar();
    var b = $('#agrbar');
    if (!b || $('#' + id)) return;
    var x = document.createElement('button'); x.id = id; x.textContent = label; x.onclick = fn;
    b.appendChild(x);
  }
  function howTo() {
    var ua = navigator.userAgent || '';
    if (/iphone|ipad|ipod/i.test(ua)) toast("Sur iPhone : touche le bouton Partager (carré avec une flèche), puis « Sur l'écran d'accueil ».", 8000);
    else if (/android/i.test(ua)) toast("Sur Android : ouvre le menu ⋮ du navigateur, puis « Installer l'application » ou « Ajouter à l'écran d'accueil ».", 8000);
    else toast("Sur PC : clique sur l'icône d'installation à droite de la barre d'adresse, ou menu ⋮ > Enregistrer et partager > Installer.", 8000);
  }
  function installClick() {
    if (dp) { dp.prompt(); dp.userChoice.then(function () { dp = null; var b = $('#agrbi'); if (b) b.remove(); }); }
    else howTo();
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); dp = e;
    if (!standalone) addBtn('agrbi', '📲 Installer', installClick);
  });
  window.addEventListener('appinstalled', function () { dp = null; var b = $('#agrbi'); if (b) b.remove(); toast('Appli installée.'); });
  function refresh() {
    var p = [];
    if (window.caches) p.push(caches.keys().then(function (k) { return Promise.all(k.map(function (x) { return caches.delete(x); })); }));
    if (navigator.serviceWorker) p.push(navigator.serviceWorker.getRegistrations().then(function (r) { return Promise.all(r.map(function (x) { return x.unregister(); })); }));
    Promise.all(p).then(function () { location.reload(); }, function () { location.reload(); });
  }
  function init() {
    bar();
    if (standalone) addBtn('agrbr', '🔄 Mettre à jour', refresh);
    
  }
  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
