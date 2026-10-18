/* 공연 일정·문의 연결: live(구글 시트) · preview(이 컴퓨터에서 미리보기) · off(연결 전) */
(function () {
  'use strict';
  var CFG = window.SITE_CONFIG || {};
  var local = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/.test(location.hostname);
  var mode = CFG.apiUrl ? 'live' : (local ? 'preview' : 'off');
  var KEY = 'jg-preview-v1', CKEY = 'jg-preview-cache';
  var mem = { db: null, cache: {} };

  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return mem.db; } }
  function save(db) { mem.db = db; try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
  function loadCache() { try { return JSON.parse(sessionStorage.getItem(CKEY)) || {}; } catch (e) { return mem.cache; } }
  function saveCache(c) { mem.cache = c; try { sessionStorage.setItem(CKEY, JSON.stringify(c)); } catch (e) {} }
  function kst() {
    var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    var o = {}; p.forEach(function (x) { o[x.type] = x.value; });
    return { date: o.year + '-' + o.month + '-' + o.day, time: o.hour + ':' + o.minute };
  }
  function uid() { return (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2) + Date.now().toString(16)).replace(/-/g, ''); }

  function previewEnv() {
    var db = load() || { events: [], inquiries: [], questions: [], settings: [], props: {} };
    var cache = loadCache();
    var env = {
      store: {
        read: function (k) { return (db[k] || []).map(function (r) { return Object.assign({}, r); }); },
        write: function (k, rows) { db[k] = rows.map(function (r) { return Object.assign({}, r); }); save(db); },
        append: function (k, r) { (db[k] = db[k] || []).push(Object.assign({}, r)); save(db); }
      },
      today: function () { return kst().date; },
      now: function () { var k = kst(); return k.date + ' ' + k.time; },
      uuid: uid,
      cache: {
        get: function (k) { var c = cache[k]; return c && c.exp > Date.now() ? c.v : null; },
        put: function (k, v, s) { cache[k] = { v: String(v), exp: Date.now() + s * 1000 }; saveCache(cache); },
        remove: function (k) { delete cache[k]; saveCache(cache); }
      },
      props: { get: function (k) { return db.props[k] || null; }, set: function (k, v) { db.props[k] = v; save(db); } },
      hash: function (s) { return 'p:' + s; },
      setPassword: function (pw) { db.props.ADMIN_HASH = 'p:' + pw; save(db); },
      setupCode: function (c) { return c === 'PREVIEW'; },
      mail: function (to, subject) { if (window.console) console.info('[미리보기] 알림 메일:', to, subject); },
      lock: function (fn) { fn(); },
      ensure: function () {
        if (db.props.READY) return;
        JG.setup(env, {});
        var t = env.today();
        env.store.write('events', [
          { id: 'E-SAMPLE1', date: JG.addDays(t, 12), time: '10:30', kind: '공연', title: '은혜갚은 호랑이', place: '부산 해운대 ○○ 직장어린이집 (예시)', region: '해운대구', visibility: '기관 숨김', memo: '미리보기 예시 일정', createdAt: env.now() },
          { id: 'E-SAMPLE2', date: JG.addDays(t, 19), time: '', kind: '불가', title: '', place: '', region: '', visibility: '기관 숨김', memo: '미리보기 예시: 극단 사정', createdAt: env.now() }
        ].map(JG.fromEvent));
        db.props.READY = '1';
        db.props.ADMIN_HASH = 'p:preview1234';
        save(db);
      }
    };
    return env;
  }

  function call(action, data) {
    data = data || {};
    if (mode === 'live') {
      var url = CFG.apiUrl;
      var req = action === 'public'
        ? fetch(url + (url.indexOf('?') < 0 ? '?' : '&') + 'action=public&t=' + Date.now(), { redirect: 'follow' })
        : fetch(url, { method: 'POST', body: JSON.stringify(Object.assign({ action: action }, data)), redirect: 'follow' });
      return req.then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .catch(function () { return { ok: false, code: 'network', message: '연결이 잠시 원활하지 않아요. 잠시 후 다시 시도해 주세요.' }; });
    }
    if (mode === 'preview') {
      return new Promise(function (res) {
        setTimeout(function () { res(JSON.parse(JSON.stringify(JG.handle(Object.assign({ action: action }, data), previewEnv())))); }, 220);
      });
    }
    return Promise.resolve({ ok: false, code: 'off', message: '온라인 일정이 아직 연결되지 않았어요.' });
  }

  window.JGApi = {
    mode: mode, call: call, config: CFG,
    resetPreview: function () { mem = { db: null, cache: {} }; try { localStorage.removeItem(KEY); sessionStorage.removeItem(CKEY); } catch (e) {} }
  };
})();
