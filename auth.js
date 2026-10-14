(function () {
  if (window.AGRI_CONFIG && window.AGRI_CONFIG.supabaseUrl && window.AGRI_CONFIG.supabaseKey) return; // mode en ligne : cloud.js
  if (window.__agriAuth) return;
  window.__agriAuth = 1;

  var AK = 'agridiam_auth_v1', SK = 'agridiam_sess_v1', RK = 'agridiam_rem_v1', FK = 'agridiam_fail_v1';
  var ITER = 150000, NAVY = '#1F3864', REM_DAYS = 30;
  var de = document.documentElement;
  var me = null; // utilisateur connecté

  /* ---------- Verrouillage immédiat (évite d'afficher l'appli avant la connexion) ---------- */
  de.classList.add('agrlock');
  var st = document.createElement('style');
  st.textContent =
    'html.agrlock{overflow:hidden}html.agrlock body>*:not(#agrgate){visibility:hidden!important}' +
    '#agrgate{position:fixed;inset:0;z-index:1000;background:linear-gradient(160deg,' + NAVY + ',#0f2040);display:flex;align-items:center;justify-content:center;padding:16px;font-family:Arial,sans-serif;overflow:auto}' +
    '.agrc{background:#fff;color:#1b2333;width:min(380px,100%);border-radius:10px;padding:22px;box-shadow:0 8px 30px rgba(0,0,0,.4)}' +
    '.agrc img{display:block;height:64px;margin:0 auto 8px;border-radius:8px}' +
    '.agrc h1{margin:0 0 4px;text-align:center;font-size:20px;color:' + NAVY + '}' +
    '.agrc p.s{margin:0 0 14px;text-align:center;color:#6b7690;font-size:13px}' +
    '.agrc label{display:block;font-size:12px;font-weight:bold;color:#44506a;margin:10px 0 4px}' +
    '.agrc input[type=email],.agrc input[type=password],.agrc input[type=text]{width:100%;box-sizing:border-box;padding:10px;border:1px solid #b9c1d0;border-radius:6px;font:15px Arial,sans-serif}' +
    '.agrc input:focus{outline:2px solid ' + NAVY + '}' +
    '.agrc .ck{display:flex;align-items:center;gap:7px;font-weight:normal;font-size:13px;margin:10px 0 0}' +
    '.agrc button,.agrau button{font:14px Arial,sans-serif;border:1px solid ' + NAVY + ';background:#fff;color:' + NAVY + ';border-radius:6px;padding:9px 14px;cursor:pointer}' +
    '.agrc button.pri,.agrau button.pri{background:' + NAVY + ';color:#fff}' +
    '.agrc .go{width:100%;margin-top:16px;padding:11px}' +
    '.agrc .er{color:#b3261e;font-size:13px;margin-top:10px;min-height:16px}' +
    '.agrc a{color:' + NAVY + ';font-size:13px;cursor:pointer;text-decoration:underline}' +
    '.agrau{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:500;display:flex;align-items:flex-start;justify-content:center;overflow:auto;font-family:Arial,sans-serif}' +
    '.agrau .pn{background:#fff;color:#1b2333;width:min(560px,96vw);margin:12px auto;border-radius:8px;overflow:hidden}' +
    '.agrau .hd{background:' + NAVY + ';color:#fff;padding:10px 14px;display:flex;align-items:center;gap:8px}.agrau .hd b{flex:1}' +
    '.agrau .hd button{border-color:#fff}' +
    '.agrau .bd{padding:12px 14px}.agrau h3{margin:14px 0 6px;font-size:14px;color:' + NAVY + '}' +
    '.agrau input,.agrau select{font:14px Arial,sans-serif;padding:8px;border:1px solid #b9c1d0;border-radius:5px;width:100%;box-sizing:border-box;margin-bottom:6px}' +
    '.agrau .u{display:flex;gap:6px;align-items:center;border:1px solid #d5dae3;border-radius:6px;padding:7px 9px;margin:6px 0;flex-wrap:wrap}.agrau .u span{flex:1;min-width:150px;word-break:break-all}' +
    '.agrau .u small{color:#6b7690}.agrau .u button{padding:5px 9px;font-size:12px}' +
    '.agrau .m{font-size:13px;margin:6px 0;min-height:16px}' +
    '@media print{#agrgate,.agrau{display:none!important}}';
  document.head.appendChild(st);

  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function el(h) { var d = document.createElement('div'); d.innerHTML = h; return d.firstElementChild; }
  function now() { return Date.now(); }

  /* ---------- Stockage des comptes ---------- */
  function loadDB() { try { var d = JSON.parse(localStorage.getItem(AK)); if (d && Array.isArray(d.users)) return d; } catch (e) { } return { users: [] }; }
  function saveDB(d) { localStorage.setItem(AK, JSON.stringify(d)); }
  function findU(d, email) { email = (email || '').toLowerCase().trim(); return d.users.filter(function (u) { return u.email === email; })[0]; }

  /* ---------- Mots de passe (PBKDF2) ---------- */
  function enc(s) { return new TextEncoder().encode(s); }
  function b64(buf) { var a = new Uint8Array(buf), s = ''; for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }
  function unb64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function hash(pw, salt, it) {
    return crypto.subtle.importKey('raw', enc(pw), 'PBKDF2', false, ['deriveBits']).then(function (k) {
      return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(salt), iterations: it }, k, 256);
    }).then(b64);
  }
  function mkUser(email, pw, role) {
    var salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    return hash(pw, salt, ITER).then(function (h) {
      return { email: email.toLowerCase().trim(), role: role, salt: salt, it: ITER, hash: h, created: new Date().toISOString() };
    });
  }
  function checkPw(u, pw) { return hash(pw, u.salt, u.it || ITER).then(function (h) { return h === u.hash; }); }
  function pwProblem(pw) { return pw.length < 8 ? 'Le mot de passe doit contenir au moins 8 caractères.' : ''; }
  function mailOK(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

  /* ---------- Tentatives ---------- */
  function failInfo() { try { return JSON.parse(localStorage.getItem(FK)) || { n: 0, until: 0 }; } catch (e) { return { n: 0, until: 0 }; } }
  function failAdd() { var f = failInfo(); f.n++; if (f.n >= 5) f.until = now() + Math.min(600, 30 * (f.n - 4)) * 1000; localStorage.setItem(FK, JSON.stringify(f)); }
  function failReset() { localStorage.removeItem(FK); }

  /* ---------- Session ---------- */
  function setSession(u, remember) {
    var s = { email: u.email, exp: now() + 12 * 3600 * 1000 };
    sessionStorage.setItem(SK, JSON.stringify(s));
    if (remember) localStorage.setItem(RK, JSON.stringify({ email: u.email, exp: now() + REM_DAYS * 86400000 }));
    else localStorage.removeItem(RK);
  }
  function sessionUser() {
    var d = loadDB(), s;
    try { s = JSON.parse(sessionStorage.getItem(SK)); } catch (e) { }
    if (s && s.exp > now() && findU(d, s.email)) return findU(d, s.email);
    try { s = JSON.parse(localStorage.getItem(RK)); } catch (e) { s = null; }
    if (s && s.exp > now() && findU(d, s.email)) { var u = findU(d, s.email); sessionStorage.setItem(SK, JSON.stringify({ email: u.email, exp: now() + 12 * 3600 * 1000 })); return u; }
    return null;
  }
  function logout() { sessionStorage.removeItem(SK); localStorage.removeItem(RK); location.reload(); }

  /* ---------- Écran de connexion ---------- */
  function gate(mode) {
    var g = $('#agrgate'); if (g) g.remove();
    var setup = mode === 'setup';
    g = el('<div id="agrgate"><form class="agrc" autocomplete="on">' +
      '<img src="/icon-192.png" alt="">' +
      '<h1>AGRIDIAM</h1>' +
      '<p class="s">' + (setup ? 'Première utilisation : crée le compte administrateur.' : 'Connecte-toi pour accéder à l\u2019application.') + '</p>' +
      '<label for="agre">Adresse e-mail</label><input id="agre" type="email" name="username" autocomplete="username" required>' +
      '<label for="agrp">Mot de passe</label><input id="agrp" type="password" name="password" autocomplete="' + (setup ? 'new-password' : 'current-password') + '" required>' +
      (setup ? '<label for="agrq">Confirmer le mot de passe</label><input id="agrq" type="password" autocomplete="new-password" required>' : '') +
      '<label class="ck"><input type="checkbox" id="agrs"> Afficher le mot de passe</label>' +
      (setup ? '' : '<label class="ck"><input type="checkbox" id="agrr"> Rester connecté sur cet appareil (30 jours)</label>') +
      '<button class="pri go" type="submit">' + (setup ? 'Créer le compte' : 'Se connecter') + '</button>' +
      '<div class="er" id="agrer" role="alert"></div>' +
      (setup ? '<p style="text-align:center;margin:8px 0 0"><a id="agrimp">J\u2019ai déjà des comptes (importer un fichier)</a></p><input type="file" id="agrif" accept=".json" hidden>' : '') +
      '</form></div>');
    document.body.appendChild(g);
    var f = $('form', g), er = $('#agrer', g);
    $('#agrs', g).onchange = function (e) { $('#agrp', g).type = e.target.checked ? 'text' : 'password'; if ($('#agrq', g)) $('#agrq', g).type = e.target.checked ? 'text' : 'password'; };
    setTimeout(function () { $('#agre', g).focus(); }, 50);
    if (setup) {
      $('#agrimp', g).onclick = function () { $('#agrif', g).click(); };
      $('#agrif', g).onchange = function (e) { importFile(e.target.files[0], function (ok, msg) { if (ok) location.reload(); else er.textContent = msg; }); };
    }
    f.onsubmit = function (ev) {
      ev.preventDefault(); er.textContent = '';
      if (!window.crypto || !crypto.subtle) { er.textContent = 'Ce navigateur ne permet pas la connexion sécurisée (ouvre le site en https).'; return; }
      var email = $('#agre', g).value.trim(), pw = $('#agrp', g).value;
      if (!mailOK(email)) { er.textContent = 'Adresse e-mail non valide.'; return; }
      if (setup) {
        var pb = pwProblem(pw); if (pb) { er.textContent = pb; return; }
        if (pw !== $('#agrq', g).value) { er.textContent = 'Les deux mots de passe ne sont pas identiques.'; return; }
        mkUser(email, pw, 'admin').then(function (u) { saveDB({ users: [u] }); setSession(u, false); enter(u); });
        return;
      }
      var fi = failInfo();
      if (fi.until > now()) { er.textContent = 'Trop d\u2019essais. Réessaie dans ' + Math.ceil((fi.until - now()) / 1000) + ' secondes.'; return; }
      var u = findU(loadDB(), email);
      var done = function (ok) {
        if (ok) { failReset(); setSession(u, $('#agrr', g).checked); enter(u); }
        else { failAdd(); er.textContent = 'E-mail ou mot de passe incorrect.'; $('#agrp', g).value = ''; }
      };
      if (!u) { hash(pw, b64(new Uint8Array(16)), ITER).then(function () { done(false); }); return; }
      checkPw(u, pw).then(done);
    };
  }

  function enter(u) {
    me = u;
    var g = $('#agrgate'); if (g) g.remove();
    de.classList.remove('agrlock');
    addUserBtn();
  }

  /* ---------- Bouton utilisateur ---------- */
  function addUserBtn() {
    var tries = 0, t = setInterval(function () {
      var bar = $('#agrbar');
      if (bar || ++tries > 40) {
        clearInterval(t);
        if (bar && !$('#agrbu')) {
          var b = document.createElement('button'); b.id = 'agrbu';
          b.textContent = '👤 ' + me.email.split('@')[0];
          b.onclick = panel; bar.appendChild(b);
        }
      }
    }, 250);
  }

  /* ---------- Panneau utilisateur ---------- */
  function download(text, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }
  function importFile(f, cb) {
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var d = JSON.parse(fr.result);
        if (!d.users || !d.users.length) throw 0;
        d.users.forEach(function (u) { if (!u.email || !u.salt || !u.hash) throw 0; });
        var cur = loadDB();
        d.users.forEach(function (u) { var i = cur.users.map(function (x) { return x.email; }).indexOf(u.email); if (i > -1) cur.users[i] = u; else cur.users.push(u); });
        if (!cur.users.some(function (u) { return u.role === 'admin'; })) throw 0;
        saveDB(cur); cb(true);
      } catch (e) { cb(false, 'Fichier de comptes non valide.'); }
    };
    fr.readAsText(f);
  }
  function panel() {
    var o = el('<div class="agrau"><div class="pn"><div class="hd"><b>👤 ' + esc(me.email) + ' <small>(' + (me.role === 'admin' ? 'administrateur' : 'utilisateur') + ')</small></b><button data-a="x">✕ Fermer</button></div><div class="bd" id="agrbd"></div></div></div>');
    document.body.appendChild(o);
    var bd = $('#agrbd', o);
    function msg(t, ok) { var m = $('#agrm', o); if (m) { m.textContent = t; m.style.color = ok ? '#1b5e20' : '#b3261e'; } }
    function draw() {
      var d = loadDB(), h = '<h3>Mon mot de passe</h3>' +
        '<input type="password" id="agro" placeholder="Mot de passe actuel" autocomplete="current-password">' +
        '<input type="password" id="agrn" placeholder="Nouveau mot de passe (8 caractères minimum)" autocomplete="new-password">' +
        '<button class="pri" data-a="cp">Changer mon mot de passe</button> <button data-a="out">Se déconnecter</button>' +
        '<div class="m" id="agrm"></div>';
      if (me.role === 'admin') {
        h += '<h3>Utilisateurs</h3>' + d.users.map(function (u) {
          return '<div class="u"><span>' + esc(u.email) + ' <small>' + (u.role === 'admin' ? 'administrateur' : 'utilisateur') + '</small></span>' +
            '<button data-a="rp" data-e="' + esc(u.email) + '">Nouveau mot de passe</button>' +
            (u.email !== me.email ? '<button data-a="du" data-e="' + esc(u.email) + '">Supprimer</button>' : '') + '</div>';
        }).join('') +
          '<h3>Ajouter un utilisateur</h3><input type="email" id="agrne" placeholder="Adresse e-mail"><input type="password" id="agrnp" placeholder="Mot de passe (8 caractères minimum)" autocomplete="new-password">' +
          '<select id="agrnr"><option value="user">Utilisateur</option><option value="admin">Administrateur</option></select><button class="pri" data-a="au">Ajouter</button>' +
          '<h3>Comptes sur un autre appareil</h3><p style="font-size:12px;color:#6b7690;margin:0 0 6px">Les comptes sont enregistrés sur chaque appareil. Exporte-les ici, puis importe le fichier sur l\u2019autre appareil (les mots de passe restent protégés).</p>' +
          '<button data-a="ex">Exporter les comptes</button> <button data-a="im">Importer des comptes</button><input type="file" id="agrif2" accept=".json" hidden>';
      }
      bd.innerHTML = h;
      var f2 = $('#agrif2', o);
      if (f2) f2.onchange = function (e) { importFile(e.target.files[0], function (ok, m) { if (ok) { draw(); msg('Comptes importés.', true); } else msg(m); }); e.target.value = ''; };
    }
    o.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-a]') : null; if (!b) return;
      var a = b.getAttribute('data-a'), em = b.getAttribute('data-e'), d = loadDB();
      if (a === 'x') o.remove();
      if (a === 'out') logout();
      if (a === 'ex') download(JSON.stringify({ v: 1, users: d.users }), 'comptes_agridiam_' + new Date().toISOString().slice(0, 10) + '.json');
      if (a === 'im') $('#agrif2', o).click();
      if (a === 'cp') {
        var op = $('#agro', o).value, np = $('#agrn', o).value, pb = pwProblem(np);
        if (pb) return msg(pb);
        checkPw(findU(d, me.email), op).then(function (ok) {
          if (!ok) return msg('Mot de passe actuel incorrect.');
          mkUser(me.email, np, me.role).then(function (nu) { var i = d.users.map(function (x) { return x.email; }).indexOf(me.email); d.users[i] = nu; saveDB(d); me = nu; draw(); msg('Mot de passe modifié.', true); });
        });
      }
      if (a === 'au') {
        var ne = $('#agrne', o).value.trim(), npw = $('#agrnp', o).value, nr = $('#agrnr', o).value;
        if (!mailOK(ne)) return msg('Adresse e-mail non valide.');
        if (findU(d, ne)) return msg('Cet utilisateur existe déjà.');
        var pb2 = pwProblem(npw); if (pb2) return msg(pb2);
        mkUser(ne, npw, nr).then(function (nu) { d.users.push(nu); saveDB(d); draw(); msg('Utilisateur ajouté.', true); });
      }
      if (a === 'rp') {
        var p = prompt('Nouveau mot de passe pour ' + em + ' (8 caractères minimum) :'); if (!p) return;
        var pb3 = pwProblem(p); if (pb3) return msg(pb3);
        mkUser(em, p, findU(d, em).role).then(function (nu) { var i = d.users.map(function (x) { return x.email; }).indexOf(em); d.users[i] = nu; saveDB(d); if (em === me.email) me = nu; draw(); msg('Mot de passe modifié.', true); });
      }
      if (a === 'du') {
        if (!confirm('Supprimer le compte ' + em + ' ?')) return;
        d.users = d.users.filter(function (u) { return u.email !== em; });
        if (!d.users.some(function (u) { return u.role === 'admin'; })) return msg('Il doit rester au moins un administrateur.');
        saveDB(d); draw(); msg('Compte supprimé.', true);
      }
    });
    draw();
  }

  /* ---------- Démarrage ---------- */
  function start() {
    var u = sessionUser();
    if (u) return enter(u);
    gate(loadDB().users.length ? 'login' : 'setup');
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
