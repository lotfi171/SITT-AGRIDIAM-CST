(function () {
  var C = window.AGRI_CONFIG || {};
  if (!C.supabaseUrl || !C.supabaseKey) return; // pas configuré : mode local (auth.js)
  if (window.__agriCloud) return;
  window.__agriCloud = 1;

  var BASE = String(C.supabaseUrl).replace(/\/+$/, ''), KEY = C.supabaseKey;
  var SS = 'agri_sb_session', NAVY = '#1F3864';
  var MOD = (location.pathname.split('/').pop() || 'index').replace(/\.html$/, '') || 'index';
  var CAISSE_KEY = 'agridiam_caisse_clients_multi_v1', CK_BASE = 'agri_c_base', CK_DIRTY = 'agri_c_dirty';
  var ROLES = { admin: 'Administrateur', contributeur: 'Contributeur', lecteur: 'Lecteur' };
  var de = document.documentElement;
  var sess = null, prof = null, db = null, syncOn = false, pushT = null, pollT = null, realSet = null;
  var readyRes; var ready = new Promise(function (r) { readyRes = r; });

  de.classList.add('agrlock');

  /* ---------- Styles ---------- */
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
    '.agrc .ok{color:#1b5e20}' +
    '.agrc a{color:' + NAVY + ';font-size:13px;cursor:pointer;text-decoration:underline}' +
    '.agrau{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:500;display:flex;align-items:flex-start;justify-content:center;overflow:auto;font-family:Arial,sans-serif}' +
    '.agrau .pn{background:#fff;color:#1b2333;width:min(640px,96vw);margin:12px auto;border-radius:8px;overflow:hidden}' +
    '.agrau .hd{background:' + NAVY + ';color:#fff;padding:10px 14px;display:flex;align-items:center;gap:8px}.agrau .hd b{flex:1}' +
    '.agrau .hd button{border-color:#fff}' +
    '.agrau .bd{padding:12px 14px}.agrau h3{margin:14px 0 6px;font-size:14px;color:' + NAVY + '}' +
    '.agrau input,.agrau select{font:14px Arial,sans-serif;padding:8px;border:1px solid #b9c1d0;border-radius:5px;width:100%;box-sizing:border-box;margin-bottom:6px}' +
    '.agrau .u{display:flex;gap:6px;align-items:center;border:1px solid #d5dae3;border-radius:6px;padding:7px 9px;margin:6px 0;flex-wrap:wrap}.agrau .u .e{flex:1 1 200px;word-break:break-all}' +
    '.agrau .u select,.agrau .u input[type=text]{width:auto;margin:0}.agrau .u button{padding:5px 9px;font-size:12px}' +
    '.agrau .m{font-size:13px;margin:6px 0;min-height:16px}' +
    '.agrbn{position:fixed;top:0;left:0;right:0;z-index:400;background:#fff3cd;color:#664d03;padding:8px 12px;font:13px Arial,sans-serif;display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;border-bottom:1px solid #e0c36a}' +
    '.agrbn button{font:13px Arial,sans-serif;border:1px solid ' + NAVY + ';background:' + NAVY + ';color:#fff;border-radius:5px;padding:5px 10px;cursor:pointer}' +
    '@media print{#agrgate,.agrau,.agrbn{display:none!important}}';
  document.head.appendChild(st);

  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function el(h) { var d = document.createElement('div'); d.innerHTML = h; return d.firstElementChild; }
  function enc(s) { return encodeURIComponent(s); }
  function nowS() { return Math.floor(Date.now() / 1000); }
  function toast(t, ms) {
    var n = el('<div style="position:fixed;left:50%;bottom:70px;transform:translateX(-50%);max-width:90vw;text-align:center;background:#222;color:#fff;padding:9px 14px;border-radius:6px;z-index:600;font:13px Arial,sans-serif">' + esc(t) + '</div>');
    document.body.appendChild(n); setTimeout(function () { n.remove(); }, ms || 3500);
  }
  function download(text, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }
  function fr(msg) {
    msg = String(msg || '');
    if (/invalid login credentials/i.test(msg)) return 'E-mail ou mot de passe incorrect.';
    if (/email not confirmed/i.test(msg)) return "L'adresse e-mail n'est pas encore confirmée.";
    if (/rate limit|too many/i.test(msg)) return 'Trop de tentatives. Réessaie dans quelques minutes.';
    if (/password should be at least|weak/i.test(msg)) return 'Mot de passe trop faible (8 caractères minimum).';
    if (/same password|different from the old/i.test(msg)) return "Le nouveau mot de passe doit être différent de l'ancien.";
    if (/failed to fetch|network/i.test(msg)) return 'Pas de connexion internet.';
    return msg || 'Erreur.';
  }

  /* ---------- Appels API ---------- */
  function raw(path, o) {
    o = o || {};
    var h = Object.assign({ apikey: KEY }, o.headers || {});
    if (o.auth !== false) {
      var tk = o.token || (sess && sess.access_token);
      if (tk) h.Authorization = 'Bearer ' + tk;
      else if (!/^sb_/.test(KEY)) h.Authorization = 'Bearer ' + KEY; // nouvelles clés sb_... : pas un JWT, apikey seul suffit
    }
    var body = o.body;
    if (o.json !== undefined) { h['Content-Type'] = 'application/json'; body = JSON.stringify(o.json); }
    return fetch(BASE + path, { method: o.method || 'GET', headers: h, body: body });
  }
  var refreshing = null;
  function refresh() {
    if (!sess || !sess.refresh_token) return Promise.resolve(false);
    if (refreshing) return refreshing;
    refreshing = raw('/auth/v1/token?grant_type=refresh_token', { method: 'POST', json: { refresh_token: sess.refresh_token }, auth: false })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) { sess = null; clearSess(); return false; } setSess(d); return true; }); })
      .catch(function () { return false; })
      .then(function (x) { refreshing = null; return x; });
    return refreshing;
  }
  function api(path, o) {
    var p = Promise.resolve(true);
    if (sess && sess.expires_at - nowS() < 60) p = refresh();
    return p.then(function () {
      return raw(path, o).then(function (r) {
        if (r.status === 401 && sess) return refresh().then(function (ok) { return ok ? raw(path, o) : r; });
        return r;
      });
    });
  }
  function errFrom(r) {
    return r.text().then(function (t) {
      var d = {}; try { d = JSON.parse(t); } catch (e) { }
      var e = new Error(d.message || d.msg || ('HTTP ' + r.status));
      e.status = r.status;
      if (r.status === 401 || r.status === 403 || d.code === '42501') e.code = 'invalid_argument';
      return e;
    });
  }

  /* ---------- Session ---------- */
  var persist = true;
  function setSess(d) {
    sess = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at || (nowS() + (d.expires_in || 3600)), user: d.user || (sess && sess.user) };
    try { (persist ? localStorage : sessionStorage).setItem(SS, JSON.stringify(sess)); } catch (e) { }
  }
  function clearSess() { try { localStorage.removeItem(SS); sessionStorage.removeItem(SS); } catch (e) { } }
  function loadSess() {
    try { var s = JSON.parse(sessionStorage.getItem(SS)); if (s) { persist = false; return s; } } catch (e) { }
    try { var l = JSON.parse(localStorage.getItem(SS)); if (l) { persist = true; return l; } } catch (e) { }
    return null;
  }
  function loadProfile() {
    return api('/rest/v1/profiles?id=eq.' + enc(sess.user.id) + '&select=*').then(function (r) {
      if (!r.ok) return errFrom(r).then(function (e) { throw e; });
      return r.json();
    }).then(function (a) { prof = a[0] || null; return prof; });
  }
  function signOut(reload) {
    var done = function () {
      clearSess(); sess = null; prof = null;
      var dirty = false; try { dirty = localStorage.getItem(CK_DIRTY) === '1'; } catch (e) { }
      var synced = false; try { synced = !!localStorage.getItem(CK_BASE); } catch (e) { }
      if (!dirty && synced) { try { localStorage.removeItem(CAISSE_KEY); localStorage.removeItem(CK_BASE); } catch (e) { } }
      if (reload !== false) location.reload();
    };
    if (sess) raw('/auth/v1/logout', { method: 'POST' }).then(done, done); else done();
  }

  /* ---------- Écrans de connexion ---------- */
  function gate(mode, info) {
    var g = $('#agrgate'); if (g) g.remove();
    var h = '<div id="agrgate"><form class="agrc" autocomplete="on"><img src="icon-192.png" alt=""><h1>AGRIDIAM</h1>';
    if (mode === 'login') {
      h += '<p class="s">Connecte-toi pour accéder à l\u2019application.</p>' +
        '<label for="agre">Adresse e-mail</label><input id="agre" type="email" name="username" autocomplete="username" required>' +
        '<label for="agrp">Mot de passe</label><input id="agrp" type="password" name="password" autocomplete="current-password" required>' +
        '<label class="ck"><input type="checkbox" id="agrs"> Afficher le mot de passe</label>' +
        '<label class="ck"><input type="checkbox" id="agrr" checked> Rester connecté sur cet appareil</label>' +
        '<button class="pri go" type="submit">Se connecter</button>' +
        '<p style="text-align:center;margin:12px 0 0"><a id="agrf">Mot de passe oublié ?</a></p>';
    } else if (mode === 'forgot') {
      h += '<p class="s">Entre ton adresse e-mail : tu recevras un lien pour choisir un nouveau mot de passe.</p>' +
        '<label for="agre">Adresse e-mail</label><input id="agre" type="email" autocomplete="username" required>' +
        '<button class="pri go" type="submit">Envoyer le lien</button>' +
        '<p style="text-align:center;margin:12px 0 0"><a id="agrb">Retour à la connexion</a></p>';
    } else if (mode === 'recover') {
      h += '<p class="s">Choisis ton mot de passe (8 caractères minimum).</p>' +
        '<label for="agrp">Nouveau mot de passe</label><input id="agrp" type="password" autocomplete="new-password" required>' +
        '<label for="agrq">Confirmer le mot de passe</label><input id="agrq" type="password" autocomplete="new-password" required>' +
        '<label class="ck"><input type="checkbox" id="agrs"> Afficher le mot de passe</label>' +
        '<button class="pri go" type="submit">Enregistrer</button>';
    } else {
      h += '<p class="s">' + esc(info || '') + '</p><button class="pri go" type="button" id="agrb">Retour à la connexion</button>';
    }
    h += '<div class="er" id="agrer" role="alert"></div></form></div>';
    g = el(h); document.body.appendChild(g);
    var f = $('form', g), er = $('#agrer', g);
    var s = $('#agrs', g); if (s) s.onchange = function (e) { var t = e.target.checked ? 'text' : 'password'; ['#agrp', '#agrq'].forEach(function (i) { var x = $(i, g); if (x) x.type = t; }); };
    var b = $('#agrb', g); if (b) b.onclick = function () { gate('login'); };
    var fg = $('#agrf', g); if (fg) fg.onclick = function () { gate('forgot'); };
    setTimeout(function () { var x = $('#agre', g) || $('#agrp', g); if (x) x.focus(); }, 50);
    if (info && (mode === 'login' || mode === 'forgot')) { er.textContent = info; }

    f.onsubmit = function (ev) {
      ev.preventDefault(); er.textContent = ''; er.className = 'er';
      if (mode === 'login') {
        var em = $('#agre', g).value.trim(), pw = $('#agrp', g).value;
        persist = $('#agrr', g).checked;
        raw('/auth/v1/token?grant_type=password', { method: 'POST', json: { email: em, password: pw }, auth: false })
          .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error_description || d.msg || d.message); return d; }); })
          .then(function (d) { clearSess(); setSess(d); return afterLogin(); })
          .catch(function (e) { er.textContent = fr(e.message); var p = $('#agrp', g); if (p) p.value = ''; });
      } else if (mode === 'forgot') {
        var em2 = $('#agre', g).value.trim();
        raw('/auth/v1/recover?redirect_to=' + enc(location.origin + '/'), { method: 'POST', json: { email: em2 }, auth: false, headers: {} })
          .then(function (r) { if (!r.ok) return r.json().then(function (d) { throw new Error(d.msg || d.message); }); er.className = 'er ok'; er.textContent = 'Si cette adresse existe, un e-mail vient d\u2019être envoyé. Ouvre le lien reçu.'; })
          .catch(function (e) { er.textContent = fr(e.message); });
      } else if (mode === 'recover') {
        var p1 = $('#agrp', g).value, p2 = $('#agrq', g).value;
        if (p1.length < 8) { er.textContent = 'Le mot de passe doit contenir au moins 8 caractères.'; return; }
        if (p1 !== p2) { er.textContent = 'Les deux mots de passe ne sont pas identiques.'; return; }
        raw('/auth/v1/user', { method: 'PUT', json: { password: p1 }, token: recoverTok })
          .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.msg || d.message); return d; }); })
          .then(function () { history.replaceState(null, '', location.pathname + location.search); recoverTok = null; gate('login', 'Mot de passe enregistré. Connecte-toi.'); $('#agrer').className = 'er ok'; })
          .catch(function (e) { er.textContent = fr(e.message); });
      }
    };
  }
  var recoverTok = null;

  /* ---------- Après connexion ---------- */
  function afterLogin() {
    return loadProfile().then(function () {
      if (!prof || prof.actif === false) {
        signOut(false);
        gate('login', "Ton compte n'est pas activé. Contacte l'administrateur.");
        return;
      }
      var g = $('#agrgate'); if (g) g.remove();
      if ((MOD === 'caisse' || MOD === 'suivi') && prof.role !== 'admin') {
        document.body.appendChild(el('<div id="agrgate"><div class="agrc"><img src="icon-192.png" alt=""><h1>Accès réservé</h1><p class="s">Cette page est réservée à l\u2019administrateur.</p><a href="/" class="pri" style="display:block;text-align:center;text-decoration:none;color:#fff;background:' + NAVY + ';padding:11px;border-radius:6px">Retour au menu</a></div></div>'));
        return;
      }
      de.classList.remove('agrlock');
      realSet = Storage.prototype.setItem;
      hookCaisse();
      addUserBtn();
      readyRes();
      if (MOD === 'caisse') caisseInit();
    });
  }

  /* ---------- Base de données partagée (interface attendue par Stock et Transport) ---------- */
  function fetchAll(path) {
    var out = [], off = 0;
    function next() {
      return api(path + '&limit=1000&offset=' + off).then(function (r) {
        if (!r.ok) return errFrom(r).then(function (e) { throw e; });
        return r.json();
      }).then(function (rows) { out = out.concat(rows); if (rows.length === 1000) { off += 1000; return next(); } return out; });
    }
    return next();
  }
  function mkDB() {
    var inflight = 0, last = 0;
    function guard(p) { inflight++; return p.then(function (x) { inflight--; last = Date.now(); return x; }, function (e) { inflight--; last = Date.now(); throw e; }); }
    function sigOf(rows) { return rows.map(function (x) { return x.id + '@' + x.updated_at; }).sort().join('|'); }
    function snap(rows) { return { docs: rows.map(function (x) { return { id: x.id, data: function () { return JSON.parse(JSON.stringify(x.data)); } }; }) }; }
    return {
      collection: function (col) {
        return {
          onSnapshot: function (cb, errCb) {
            var stopped = false, lastSig = null, timer = null;
            var base = '/rest/v1/docs?collection=eq.' + enc(col) + '&order=id.asc';
            fetchAll(base + '&select=id,data,updated_at').then(function (rows) {
              if (stopped) return; lastSig = sigOf(rows); cb(snap(rows));
              timer = setInterval(function () {
                if (stopped || document.hidden || inflight > 0 || Date.now() - last < 1500) return;
                fetchAll(base + '&select=id,updated_at').then(function (lite) {
                  if (stopped || inflight > 0 || sigOf(lite) === lastSig) return;
                  return fetchAll(base + '&select=id,data,updated_at').then(function (full) {
                    if (stopped || inflight > 0) return; lastSig = sigOf(full); cb(snap(full));
                  });
                }).catch(function () { });
              }, 6000);
            }).catch(function (e) { if (errCb) errCb(e); });
            return function () { stopped = true; if (timer) clearInterval(timer); };
          }
        };
      },
      doc: function (path) {
        var i = path.indexOf('/'), col = path.slice(0, i), id = path.slice(i + 1);
        return {
          set: function (data) {
            return guard(api('/rest/v1/docs?on_conflict=collection,id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, json: { collection: col, id: id, data: data } })
              .then(function (r) { if (!r.ok) return errFrom(r).then(function (e) { throw e; }); }));
          },
          delete: function () {
            return guard(api('/rest/v1/docs?collection=eq.' + enc(col) + '&id=eq.' + enc(id), { method: 'DELETE' })
              .then(function (r) { if (!r.ok) return errFrom(r).then(function (e) { throw e; }); }));
          }
        };
      }
    };
  }
  db = mkDB();
  var U = {
    id: function () { return Promise.resolve(sess.user.id); },
    me: function () { return Promise.resolve({ name: (prof && (prof.name || prof.email)) || 'Connecté', email: prof && prof.email }); },
    canEdit: function () { return Promise.resolve(prof.role === 'admin'); },
    can: function (p) { return Promise.resolve(p === 'data.write' ? prof.role !== 'lecteur' : true); },
    profiles: function (ids) {
      if (!ids || !ids.length) return Promise.resolve({});
      return api('/rest/v1/profiles?id=in.(' + ids.map(enc).join(',') + ')&select=id,name,email').then(function (r) { return r.ok ? r.json() : []; })
        .then(function (a) { var m = {}; a.forEach(function (p) { m[p.id] = { name: p.name || p.email }; }); return m; });
    }
  };
  window.claude = {
    use: function (n) {
      if (n === 'db') return ready.then(function () { return db; });
      if (n === 'user') return ready.then(function () { return U; });
      return Promise.resolve(null);
    }
  };

  /* ---------- Caisse : synchronisation d'un document unique ---------- */
  var hooked = false;
  function hookCaisse() {
    if (hooked) return; hooked = true;
    var osi = realSet;
    Storage.prototype.setItem = function (k, v) {
      osi.call(this, k, v);
      if (this === window.localStorage && k === CAISSE_KEY && syncOn) { osi.call(localStorage, CK_DIRTY, '1'); schedulePush(); }
    };
  }
  function lget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lset(k, v) { try { (realSet || Storage.prototype.setItem).call(localStorage, k, v); } catch (e) { } }
  function banner(html, btns) {
    var b = $('.agrbn'); if (b) b.remove();
    b = el('<div class="agrbn"><span>' + html + '</span></div>');
    (btns || []).forEach(function (x) { var bt = document.createElement('button'); bt.textContent = x[0]; bt.onclick = x[1]; b.appendChild(bt); });
    document.body.appendChild(b); return b;
  }
  function clearBanner() { var b = $('.agrbn'); if (b) b.remove(); }
  function fetchRemote() {
    return api('/rest/v1/docs?collection=eq.caisse&id=eq.state&select=data,updated_at').then(function (r) {
      if (!r.ok) return errFrom(r).then(function (e) { throw e; });
      return r.json();
    }).then(function (a) { return a[0] || null; });
  }
  function stamp() { return new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'); }
  function useRemote(rem, backupLocal) {
    var local = lget(CAISSE_KEY);
    if (backupLocal && local) download(local, 'sauvegarde_caisse_appareil_' + stamp() + '.json');
    lset(CAISSE_KEY, rem.data.raw); lset(CK_BASE, rem.updated_at); lset(CK_DIRTY, '0');
    location.reload();
  }
  function useLocal(rem) {
    if (rem && rem.data && rem.data.raw) download(rem.data.raw, 'sauvegarde_caisse_en_ligne_' + stamp() + '.json');
    if (rem) lset(CK_BASE, rem.updated_at); else lset(CK_BASE, '');
    pushCaisse(true);
  }
  function conflictDialog(rem) {
    banner('Les données de la caisse en ligne et celles de cet appareil sont différentes. Une copie de sécurité de la version non retenue sera téléchargée.', [
      ['Garder celles de cet appareil', function () { useLocal(rem); clearBanner(); }],
      ['Utiliser celles en ligne', function () { useRemote(rem, true); }]
    ]);
  }
  function caisseInit() {
    fetchRemote().then(function (rem) {
      var local = lget(CAISSE_KEY), dirty = lget(CK_DIRTY) === '1', base = lget(CK_BASE) || '';
      syncOn = true;
      if (!rem) { if (local) pushCaisse(true); startPoll(); return; }
      if (rem.updated_at === base) { if (dirty) schedulePush(); startPoll(); return; }
      if (local && rem.data.raw === local) { lset(CK_BASE, rem.updated_at); lset(CK_DIRTY, '0'); startPoll(); return; }
      if (!local) { useRemote(rem, false); return; }
      if (!base || dirty) { conflictDialog(rem); startPoll(); return; }
      useRemote(rem, false);
    }).catch(function () { syncOn = true; toast('Caisse : synchronisation impossible pour le moment.', 5000); });
  }
  function schedulePush() { clearTimeout(pushT); pushT = setTimeout(function () { pushCaisse(false); }, 2500); }
  function pushCaisse(first) {
    var rawv = lget(CAISSE_KEY); if (!rawv) return Promise.resolve();
    var base = lget(CK_BASE) || '', p;
    if (base) p = api('/rest/v1/docs?collection=eq.caisse&id=eq.state&updated_at=eq.' + enc(base) + '&select=updated_at', { method: 'PATCH', headers: { Prefer: 'return=representation' }, json: { data: { raw: rawv } } });
    else p = api('/rest/v1/docs', { method: 'POST', headers: { Prefer: 'return=representation' }, json: { collection: 'caisse', id: 'state', data: { raw: rawv } } });
    return p.then(function (r) {
      if (r.ok) return r.json().then(function (rows) {
        if (rows && rows.length) {
          lset(CK_BASE, rows[0].updated_at);
          if (lget(CAISSE_KEY) === rawv) lset(CK_DIRTY, '0'); else schedulePush();
          clearBanner(); return;
        }
        return fetchRemote().then(function (rem) { if (rem) conflictDialog(rem); });
      });
      if (r.status === 409) return fetchRemote().then(function (rem) { if (rem) conflictDialog(rem); });
      return errFrom(r).then(function (e) { throw e; });
    }).catch(function (e) {
      if (e && e.code === 'invalid_argument') { toast("Tu n'as pas le droit d'enregistrer la caisse.", 5000); return; }
      toast('Caisse : enregistrement en ligne impossible, nouvel essai dans 15 s.', 4000);
      clearTimeout(pushT); pushT = setTimeout(function () { pushCaisse(false); }, 15000);
    });
  }
  function startPoll() {
    if (pollT) return;
    pollT = setInterval(function () {
      if (document.hidden || lget(CK_DIRTY) === '1') return;
      api('/rest/v1/docs?collection=eq.caisse&id=eq.state&select=updated_at').then(function (r) { return r.ok ? r.json() : []; }).then(function (a) {
        var ts = a[0] && a[0].updated_at;
        if (ts && ts !== (lget(CK_BASE) || '')) {
          banner('Les données de la caisse ont été modifiées par un autre utilisateur.', [['Actualiser', function () { fetchRemote().then(function (rem) { if (rem) useRemote(rem, false); }); }]]);
        }
      }).catch(function () { });
    }, 20000);
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden && syncOn && lget(CK_DIRTY) === '1') { clearTimeout(pushT); pushCaisse(false); } });

  /* ---------- Scans en ligne (Storage + table scans) ---------- */
  function normScan(x) { return { id: x.id, mod: x.module, label: x.label, date: x.created_at, name: x.name, type: x.type, size: x.size, path: x.path, by: x.created_by }; }
  var scans = {
    list: function (mod, all) {
      var q = '/rest/v1/scans?select=*&order=created_at.desc&limit=200' + (all ? '' : '&module=eq.' + enc(mod));
      return api(q).then(function (r) { if (!r.ok) return errFrom(r).then(function (e) { throw e; }); return r.json(); }).then(function (a) { return a.map(normScan); });
    },
    add: function (blob, meta) {
      var ext = (/pdf/.test(blob.type) ? 'pdf' : /png/.test(blob.type) ? 'png' : 'jpg');
      var id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(36).slice(2, 10));
      var path = meta.mod + '/' + id + '.' + ext;
      return api('/storage/v1/object/scans/' + path, { method: 'POST', body: blob, headers: { 'Content-Type': blob.type || 'application/octet-stream', 'x-upsert': 'false' } })
        .then(function (r) { if (!r.ok) return errFrom(r).then(function (e) { throw e; }); })
        .then(function () {
          return api('/rest/v1/scans', { method: 'POST', headers: { Prefer: 'return=minimal' }, json: { id: id, module: meta.mod, label: meta.label || '', name: meta.name, type: blob.type, size: blob.size, path: path } });
        }).then(function (r) { if (!r.ok) return errFrom(r).then(function (e) { throw e; }); });
    },
    blob: function (row) {
      return api('/storage/v1/object/authenticated/scans/' + row.path).then(function (r) { if (!r.ok) return errFrom(r).then(function (e) { throw e; }); return r.blob(); });
    },
    del: function (row) {
      return api('/storage/v1/object/scans/' + row.path, { method: 'DELETE' }).then(function () {
        return api('/rest/v1/scans?id=eq.' + enc(row.id), { method: 'DELETE' });
      }).then(function (r) { if (!r.ok) return errFrom(r).then(function (e) { throw e; }); });
    }
  };
  window.agriCloud = { enabled: true, scans: scans, role: function () { return prof && prof.role; }, ready: ready, api: api, errFrom: errFrom };

  /* ---------- Bouton et panneau utilisateur ---------- */
  function addUserBtn() {
    var tries = 0, t = setInterval(function () {
      var bar = $('#agrbar');
      if (bar || ++tries > 40) {
        clearInterval(t);
        if (bar && !$('#agrbu')) {
          var b = document.createElement('button'); b.id = 'agrbu';
          b.textContent = '👤 ' + ((prof.name || prof.email || '').split('@')[0]);
          b.onclick = panel; bar.appendChild(b);
        }
      }
    }, 250);
  }
  function panel() {
    var o = el('<div class="agrau"><div class="pn"><div class="hd"><b>👤 ' + esc(prof.email) + ' <small>(' + esc(ROLES[prof.role] || prof.role) + ')</small></b><button data-a="x">✕ Fermer</button></div><div class="bd" id="agrbd"></div></div></div>');
    document.body.appendChild(o);
    var bd = $('#agrbd', o);
    function msg(t, ok) { var m = $('#agrm', o); if (m) { m.textContent = t; m.style.color = ok ? '#1b5e20' : '#b3261e'; } }
    function draw() {
      var h = '<h3>Mon nom affiché</h3><input type="text" id="agrnm" value="' + esc(prof.name || '') + '" placeholder="Nom et prénom"><button class="pri" data-a="sn">Enregistrer le nom</button>' +
        '<h3>Mon mot de passe</h3><input type="password" id="agrn1" placeholder="Nouveau mot de passe (8 caractères minimum)" autocomplete="new-password"><button class="pri" data-a="cp">Changer mon mot de passe</button> <button data-a="out">Se déconnecter</button>' +
        '<div class="m" id="agrm"></div>';
      if (prof.role === 'admin') {
        h += '<h3>Utilisateurs</h3><div id="agrul">Chargement…</div>' +
          '<p style="font-size:12px;color:#6b7690">Pour ajouter une personne : dans Supabase, Authentication, Users, <b>Invite user</b> (elle reçoit un e-mail et choisit son mot de passe). Elle apparaît ensuite ici avec le rôle « Lecteur » : choisis son rôle puis enregistre.</p>';
      }
      bd.innerHTML = h;
      if (prof.role === 'admin') {
        api('/rest/v1/profiles?select=*&order=email.asc').then(function (r) { return r.ok ? r.json() : []; }).then(function (a) {
          $('#agrul', o).innerHTML = a.map(function (u) {
            return '<div class="u" data-id="' + esc(u.id) + '"><span class="e">' + esc(u.email) + '</span>' +
              '<input type="text" class="n" value="' + esc(u.name || '') + '" placeholder="Nom">' +
              '<select class="r">' + Object.keys(ROLES).map(function (k) { return '<option value="' + k + '"' + (u.role === k ? ' selected' : '') + '>' + ROLES[k] + '</option>'; }).join('') + '</select>' +
              '<label style="font-size:12px;display:flex;gap:4px;align-items:center"><input type="checkbox" class="a"' + (u.actif !== false ? ' checked' : '') + ' style="width:auto;margin:0"> actif</label>' +
              '<button class="pri" data-a="su">Enregistrer</button></div>';
          }).join('') || '<p>Aucun utilisateur.</p>';
        });
      }
    }
    o.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-a]') : null; if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'x') o.remove();
      if (a === 'out') signOut();
      if (a === 'sn') {
        var nm = $('#agrnm', o).value.trim();
        api('/rest/v1/rpc/set_my_name', { method: 'POST', json: { n: nm } }).then(function (r) { if (!r.ok) return errFrom(r).then(function (er) { throw er; }); prof.name = nm; msg('Nom enregistré.', true); }).catch(function (er) { msg(fr(er.message)); });
      }
      if (a === 'cp') {
        var p = $('#agrn1', o).value;
        if (p.length < 8) return msg('Le mot de passe doit contenir au moins 8 caractères.');
        api('/auth/v1/user', { method: 'PUT', json: { password: p } }).then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.msg || d.message); }); })
          .then(function () { $('#agrn1', o).value = ''; msg('Mot de passe modifié.', true); }).catch(function (er) { msg(fr(er.message)); });
      }
      if (a === 'su') {
        var row = b.closest('.u'), id = row.getAttribute('data-id');
        var body = { name: $('.n', row).value.trim(), role: $('.r', row).value, actif: $('.a', row).checked };
        api('/rest/v1/profiles?id=eq.' + enc(id), { method: 'PATCH', headers: { Prefer: 'return=representation' }, json: body })
          .then(function (r) { if (!r.ok) return r.json().then(function (d) { throw new Error(d.message || d.msg); }); return r.json(); })
          .then(function (rows) { msg(rows.length ? 'Utilisateur enregistré.' : "Modification refusée.", !!rows.length); }).catch(function (er) { msg(fr(er.message)); });
      }
    });
    draw();
  }

  /* ---------- Démarrage ---------- */
  function start() {
    // Lien reçu par e-mail (invitation ou mot de passe oublié)
    var h = (location.hash || '').replace(/^#/, ''), q = {};
    h.split('&').forEach(function (p) { var i = p.indexOf('='); if (i > 0) q[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1)); });
    if (q.access_token && (q.type === 'recovery' || q.type === 'invite')) { recoverTok = q.access_token; gate('recover'); return; }
    if (q.error_description) { gate('login', fr(q.error_description.replace(/\+/g, ' '))); return; }
    sess = loadSess();
    if (!sess) { gate('login'); return; }
    (sess.expires_at - nowS() < 60 ? refresh() : Promise.resolve(true)).then(function (ok) {
      if (!ok) { gate('login'); return; }
      return afterLogin();
    }).catch(function () { gate('login', 'Connexion au serveur impossible. Vérifie internet puis recharge la page.'); });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
