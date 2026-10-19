/* 아동극단 징검다리 관리자 화면: 문의 내역 · 공연 일정 · 문의 질문 · 설정 */
(function () {
  'use strict';
  var root = document.getElementById('admin-root');
  var el = JGForm.el, api = JGApi;
  var TOKEN_KEY = 'jg-admin-token';
  var S = { token: null, data: null, tab: 'inq', filter: '새 문의', month: null, edit: null, open: {}, draft: null, dirty: false };
  var TABS = [['inq', '문의 내역', 'ph-tray'], ['cal', '공연 일정', 'ph-calendar-blank'], ['q', '문의 질문', 'ph-list-checks'], ['set', '설정', 'ph-gear-six']];

  function icon(n) { return el('i', { class: 'ph ' + n, 'aria-hidden': 'true' }); }
  function tokenGet() { try { return sessionStorage.getItem(TOKEN_KEY); } catch (e) { return S.token; } }
  function tokenSet(t) { S.token = t; try { if (t) sessionStorage.setItem(TOKEN_KEY, t); else sessionStorage.removeItem(TOKEN_KEY); } catch (e) {} }
  var toastBox = document.querySelector('.toast'), toastTimer;
  function toast(msg, bad) { toastBox.textContent = msg; toastBox.className = 'toast show' + (bad ? ' bad' : ''); clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastBox.className = 'toast'; }, 2600); }
  function call(action, data) {
    return api.call(action, Object.assign({ token: S.token }, data || {})).then(function (r) {
      if (r && r.code === 'auth') { tokenSet(null); login('로그인 시간이 지났어요. 다시 로그인해 주세요.'); }
      return r || { ok: false, message: '응답이 없어요.' };
    });
  }
  function busy(btn, text) { var old = btn.textContent; btn.disabled = true; btn.textContent = text || '저장 중...'; return function () { btn.disabled = false; btn.textContent = old; }; }
  function field(label, input, help, key) {
    var id = input.id || ('a-' + Math.random().toString(36).slice(2, 8));
    input.id = id;
    return el('div', { class: 'fld', 'data-key': key || null }, [el('label', { for: id, text: label }), help ? el('p', { class: 'help', text: help }) : null, input, el('p', { class: 'err', hidden: true })]);
  }
  function inp(attrs, value) { var i = el(attrs.tag || 'input', Object.assign({ class: 'inp' }, attrs, { tag: null })); if (value != null) i.value = value; return i; }
  function confirmBtn(label, ask, onYes, cls) {
    var b = el('button', { type: 'button', class: 'btn ' + (cls || 'btn-ghost') + ' danger', text: label });
    var armed = false, t;
    b.addEventListener('click', function () {
      if (!armed) { armed = true; b.textContent = ask; b.classList.add('armed'); t = setTimeout(function () { armed = false; b.textContent = label; b.classList.remove('armed'); }, 4000); return; }
      clearTimeout(t); onYes(b);
    });
    return b;
  }
  function mmdd(d) { return d.slice(5).replace('-', '.'); }

  /* ---------- 들어오기 ---------- */
  function boot() {
    if (api.mode === 'off') { offScreen(); return; }
    var t = tokenGet();
    if (t) { S.token = t; load(); } else login();
  }
  function offScreen() {
    root.textContent = '';
    root.appendChild(el('div', { class: 'login-wrap' }, [el('div', { class: 'login-card' }, [
      brand(), el('h1', { text: '아직 연결 전이에요' }),
      el('p', { class: 'lead', text: '관리자 화면은 구글 시트와 연결한 뒤에 쓸 수 있어요. 홈페이지 폴더의 js/site-config.js 에 연결 주소(apiUrl)를 넣고 다시 올려 주세요.' }),
      el('a', { class: 'btn btn-ghost', href: 'index.html', text: '홈페이지로 돌아가기' })
    ])]));
  }
  function brand() { return el('div', { class: 'adm-brand' }, [el('span', { class: 'stones-mark', 'aria-hidden': 'true' }, [el('span'), el('span'), el('span')]), el('span', { class: 'bn' }, [el('small', { text: '아동극단 ' }), el('span', { text: '징검다리' })]), el('small', { class: 'adm-tag', text: '관리자' })]); }
  function login(msg) {
    root.textContent = '';
    var card = el('div', { class: 'login-card' }, [brand(), el('p', { class: 'lead', text: '연결 상태를 확인하는 중...' })]);
    root.appendChild(el('div', { class: 'login-wrap' }, [card]));
    api.call('status').then(function (r) {
      card.textContent = '';
      card.appendChild(brand());
      if (!r.ok) { card.append(el('h1', { text: '연결하지 못했어요' }), el('p', { class: 'lead', text: r.message || '구글 시트 연결 주소를 확인해 주세요.' }), retryBtn()); return; }
      if (!r.claimed) claimForm(card); else loginForm(card, msg);
    });
  }
  function retryBtn() { var b = el('button', { type: 'button', class: 'btn btn-primary', text: '다시 시도' }); b.addEventListener('click', function () { login(); }); return b; }
  function loginForm(card, msg) {
    var pw = inp({ type: 'password', autocomplete: 'current-password', id: 'lg-pw', required: true });
    var btn = el('button', { type: 'submit', class: 'btn btn-primary', text: '로그인' });
    var err = el('p', { class: 'err', role: 'alert', hidden: !msg, text: msg || '' });
    var form = el('form', { class: 'login-form' }, [el('input', { type: 'text', name: 'username', value: 'admin', autocomplete: 'username', hidden: true }), field('관리자 비밀번호', pw), err, btn]);
    if (api.mode === 'preview') form.appendChild(el('p', { class: 'hint', text: '미리보기 모드 비밀번호: preview1234 (이 컴퓨터에서만 보이는 연습용)' }));
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var done = busy(btn, '확인 중...');
      api.call('login', { password: pw.value }).then(function (r) {
        done();
        if (r.ok) { tokenSet(r.token); load(); }
        else if (r.code === 'claim') login();
        else { err.hidden = false; err.textContent = r.message || '로그인하지 못했어요.'; pw.select(); }
      });
    });
    card.append(el('h1', { text: '로그인' }), form);
    setTimeout(function () { pw.focus(); }, 30);
  }
  function claimForm(card) {
    var code = inp({ id: 'cl-code', autocomplete: 'off', required: true }), pw = inp({ type: 'password', id: 'cl-pw', autocomplete: 'new-password', required: true }), pw2 = inp({ type: 'password', id: 'cl-pw2', autocomplete: 'new-password', required: true });
    var btn = el('button', { type: 'submit', class: 'btn btn-primary', text: '비밀번호 만들고 시작하기' });
    var err = el('p', { class: 'err', role: 'alert', hidden: true });
    var form = el('form', { class: 'login-form' }, [el('input', { type: 'text', name: 'username', value: 'admin', autocomplete: 'username', hidden: true }), field('설정 코드', code, '제작자가 따로 알려 드린 코드예요 (예: JG-ABCDE-FGHIJ). 처음 한 번만 씁니다.', 'code'), field('새 관리자 비밀번호 (8자 이상)', pw, null, 'password'), field('한 번 더 입력', pw2), err, btn]);
    if (api.mode === 'preview') form.appendChild(el('p', { class: 'hint', text: '미리보기 모드 설정 코드: PREVIEW' }));
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (pw.value !== pw2.value) { err.hidden = false; err.textContent = '두 비밀번호가 서로 달라요.'; return; }
      var done = busy(btn, '만드는 중...');
      api.call('claim', { code: code.value, password: pw.value }).then(function (r) {
        done();
        if (r.ok) { tokenSet(r.token); toast('관리자 비밀번호를 만들었어요.'); load(); }
        else { err.hidden = false; err.textContent = r.message || '만들지 못했어요.'; }
      });
    });
    card.append(el('h1', { text: '처음 한 번, 관리자 비밀번호 만들기' }), el('p', { class: 'lead', text: '이 비밀번호로 공연 일정과 문의를 관리합니다. 다른 사람과 같이 쓰는 비밀번호는 피해 주세요.' }), form);
  }

  /* ---------- 자료 불러오기와 화면 틀 ---------- */
  function load(keepTab) {
    if (!S.data) { root.textContent = ''; root.appendChild(el('p', { class: 'adm-loading', text: '자료를 불러오는 중...' })); }
    return call('admin').then(function (r) {
      if (!r.ok) { if (r.code !== 'auth') { root.textContent = ''; root.appendChild(el('div', { class: 'login-wrap' }, [el('div', { class: 'login-card' }, [brand(), el('h1', { text: '불러오지 못했어요' }), el('p', { class: 'lead', text: r.message || '' }), retryBtn()])])); } return; }
      S.data = r;
      if (!S.month) S.month = JG.monthStart(r.today);
      if (!S.draft || !S.dirty) S.draft = r.questions.map(function (q) { return Object.assign({}, q, { options: q.options.slice() }); });
      shell();
    });
  }
  function shell() {
    root.textContent = '';
    var mode = api.mode === 'preview' ? el('span', { class: 'chip-mode preview', text: '미리보기 모드 · 이 컴퓨터에만 저장' }) : el('span', { class: 'chip-mode live', text: '구글 시트 연결됨' });
    var refresh = el('button', { type: 'button', class: 'ctrl', 'aria-label': '새로고침' }, [icon('ph-arrow-clockwise')]);
    refresh.addEventListener('click', function () { load().then(function () { toast('새로 불러왔어요.'); }); });
    var out = el('button', { type: 'button', class: 'btn btn-ghost sm', text: '로그아웃' });
    out.addEventListener('click', function () { call('logout'); tokenSet(null); S.data = null; login(); });
    var newCount = S.data.inquiries.filter(function (q) { return q.status === '새 문의'; }).length;
    var tabs = el('nav', { class: 'adm-tabs', role: 'tablist', 'aria-label': '관리 메뉴' }, TABS.map(function (t) {
      var b = el('button', { type: 'button', role: 'tab', class: 'adm-tab', 'aria-selected': String(S.tab === t[0]), id: 'tab-' + t[0] }, [icon(t[2]), t[1], t[0] === 'inq' && newCount ? el('span', { class: 'count', text: String(newCount) }) : null]);
      b.addEventListener('click', function () {
        if (S.tab === 'q' && S.dirty && t[0] !== 'q') toast('문의 질문에 저장하지 않은 변경이 있어요.', true);
        S.tab = t[0]; shell();
      });
      return b;
    }));
    var main = el('main', { class: 'adm-main', role: 'tabpanel', 'aria-labelledby': 'tab-' + S.tab });
    root.appendChild(el('div', { class: 'adm-shell' }, [
      el('header', { class: 'adm-top' }, [brand(), mode, el('div', { class: 'adm-actions' }, [el('a', { class: 'btn btn-ghost sm', href: 'index.html#schedule', target: '_blank', rel: 'noopener', text: '홈페이지 보기' }), refresh, out])]),
      tabs, main
    ]));
    ({ inq: tabInquiries, cal: tabCalendar, q: tabQuestions, set: tabSettings })[S.tab](main);
  }

  /* ---------- 문의 내역 ---------- */
  function tabInquiries(main) {
    var all = S.data.inquiries;
    var counts = {}; JG.STATUSES.forEach(function (s) { counts[s] = 0; }); all.forEach(function (q) { counts[q.status]++; });
    var filters = JG.STATUSES.concat(['전체']);
    var bar = el('div', { class: 'filters', role: 'group', 'aria-label': '상태별 보기' }, filters.map(function (f) {
      var n = f === '전체' ? all.length : counts[f];
      var b = el('button', { type: 'button', class: 'chip' + (S.filter === f ? ' on' : ''), 'aria-pressed': String(S.filter === f) }, [f + ' ', el('b', { text: String(n) })]);
      b.addEventListener('click', function () { S.filter = f; shell(); });
      return b;
    }));
    main.appendChild(el('div', { class: 'adm-head' }, [el('h1', { text: '문의 내역' }), el('p', { class: 'lead', text: '홈페이지 달력에서 들어온 공연 문의입니다. 눌러서 내용을 보고 상태를 바꿔 주세요.' })]));
    main.appendChild(bar);
    var list = all.filter(function (q) { return S.filter === '전체' || q.status === S.filter; });
    if (!list.length) {
      main.appendChild(el('div', { class: 'empty big' }, [el('b', { text: S.filter === '전체' ? '아직 들어온 문의가 없어요.' : S.filter + ' 상태인 문의가 없어요.' }), el('span', { text: '홈페이지 공연 일정 달력에서 초록색 날짜를 누르면 문의가 이곳에 쌓입니다.' })]));
      return;
    }
    main.appendChild(el('div', { class: 'inq-list' }, list.map(inquiryCard)));
  }
  function inquiryCard(q) {
    var open = !!S.open[q.id];
    var head = el('button', { type: 'button', class: 'inq-head', 'aria-expanded': String(open) }, [
      el('span', { class: 'inq-date' }, [el('b', { text: q.date ? mmdd(q.date) : '-' }), q.date ? JG.weekday(q.date) + '요일' : '']),
      el('span', { class: 'inq-main' }, [el('b', { text: q.org }), el('span', { text: q.name + ' · ' + q.phone }), el('small', { text: '접수 ' + q.createdAt + ' · ' + q.id })]),
      el('span', { class: 'pill st-' + JG.STATUSES.indexOf(q.status), text: q.status }),
      icon(open ? 'ph-caret-up' : 'ph-caret-down')
    ]);
    head.addEventListener('click', function () { S.open[q.id] = !open; shell(); });
    var card = el('article', { class: 'inq' + (open ? ' open' : '') }, [head]);
    if (!open) return card;
    var rows = [['희망 날짜', q.date ? JG.dateLabel(q.date) : '-'], ['기관', q.org], ['담당자', q.name], ['연락처', q.phone]].concat(q.answers.map(function (a) { return [a.label, JG.answerText(a.value)]; }));
    var dl = el('dl', { class: 'review' }, rows.map(function (r) { return el('div', null, [el('dt', { text: r[0] }), el('dd', { text: r[1] })]); }));
    var status = el('select', { class: 'inp', id: 'st-' + q.id }, JG.STATUSES.map(function (s) { var o = el('option', { value: s, text: s }); if (s === q.status) o.selected = true; return o; }));
    var memo = inp({ tag: 'textarea', id: 'memo-' + q.id, maxlength: 1000, placeholder: '통화 내용, 견적, 다음에 할 일 등' }, q.memo);
    var save = el('button', { type: 'button', class: 'btn btn-primary sm', text: '저장' });
    save.addEventListener('click', function () {
      var done = busy(save);
      call('saveInquiry', { id: q.id, status: status.value, memo: memo.value }).then(function (r) { done(); if (r.ok) { toast('저장했어요.'); load(); } else toast(r.message || '저장하지 못했어요.', true); });
    });
    var actions = [save];
    var tel = el('a', { class: 'btn btn-ghost sm', href: 'tel:' + q.phone.replace(/\D/g, '') }, [icon('ph-phone'), '전화']);
    actions.push(tel);
    if (!q.eventId) {
      var toEv = el('button', { type: 'button', class: 'btn btn-soft sm' }, [icon('ph-calendar-plus'), '일정으로 등록']);
      toEv.addEventListener('click', function () {
        var done = busy(toEv, '등록 중...');
        call('inquiryToEvent', { id: q.id }).then(function (r) { done(); if (r.ok) { toast('공연 일정에 넣고 상태를 확정으로 바꿨어요.'); S.month = JG.monthStart(q.date); load(); } else toast(r.message || '등록하지 못했어요.', true); });
      });
      actions.push(toEv);
    } else {
      var see = el('button', { type: 'button', class: 'btn btn-soft sm' }, [icon('ph-calendar-check'), '일정 보기']);
      see.addEventListener('click', function () { S.tab = 'cal'; S.month = JG.monthStart(q.date); S.edit = S.data.events.filter(function (e) { return e.id === q.eventId; })[0] || null; shell(); });
      actions.push(see);
    }
    actions.push(confirmBtn('삭제', '한 번 더 누르면 삭제', function (b) {
      var done = busy(b, '삭제 중...');
      call('deleteInquiry', { id: q.id }).then(function (r) { done(); if (r.ok) { toast('삭제했어요.'); delete S.open[q.id]; load(); } else toast(r.message || '삭제하지 못했어요.', true); });
    }, 'btn-ghost sm'));
    card.appendChild(el('div', { class: 'inq-body' }, [dl, el('div', { class: 'inq-edit' }, [field('상태', status), field('관리자 메모', memo, '고객에게는 보이지 않아요.'), el('div', { class: 'row-btns' }, actions)])]));
    return card;
  }

  /* ---------- 공연 일정 ---------- */
  function tabCalendar(main) {
    main.appendChild(el('div', { class: 'adm-head' }, [el('h1', { text: '공연 일정' }), el('p', { class: 'lead', text: '날짜를 누르면 그 날 일정을 추가할 수 있어요. 공연이 있는 날과 불가로 막은 날은 홈페이지 달력에서 문의를 받지 않습니다.' })]));
    var grid = el('div', { class: 'cal-admin' });
    main.appendChild(grid);
    var left = el('div', { class: 'cal' }), right = el('div', { class: 'ev-side' });
    grid.append(left, right);
    drawAdminCal(left);
    editor(right);
    monthList(right);
  }
  function drawAdminCal(box) {
    var d = S.data, m = S.month, settings = d.parsed;
    var prev = el('button', { type: 'button', class: 'ctrl', 'aria-label': '이전 달' }, [icon('ph-caret-left')]);
    var next = el('button', { type: 'button', class: 'ctrl', 'aria-label': '다음 달' }, [icon('ph-caret-right')]);
    prev.addEventListener('click', function () { S.month = JG.addMonths(S.month, -1); shell(); });
    next.addEventListener('click', function () { S.month = JG.addMonths(S.month, 1); shell(); });
    var todayBtn = el('button', { type: 'button', class: 'btn btn-ghost sm', text: '이번 달' });
    todayBtn.addEventListener('click', function () { S.month = JG.monthStart(d.today); shell(); });
    box.appendChild(el('div', { class: 'cal-head' }, [el('div', { class: 'cal-title', text: m.slice(0, 4) + '년 ' + (+m.slice(5, 7)) + '월' }), el('div', { class: 'cal-nav' }, [todayBtn, prev, next])]));
    box.appendChild(el('div', { class: 'cal-week', 'aria-hidden': 'true' }, JG.WEEK.map(function (w) { return el('div', { text: w }); })));
    var days = el('div', { class: 'cal-days' });
    var lead = JG.WEEK.indexOf(JG.weekday(m));
    for (var i = 0; i < lead; i++) days.appendChild(el('div', { class: 'day pad', 'aria-hidden': 'true' }));
    var pending = {};
    d.inquiries.forEach(function (q) { if (q.status === '새 문의' || q.status === '연락함') pending[q.date] = (pending[q.date] || 0) + 1; });
    for (var day = m; day.slice(0, 7) === m.slice(0, 7); day = JG.addDays(day, 1)) {
      (function (date) {
        var info = JG.dayInfo(date, d.events, settings, d.today);
        var evs = d.events.filter(function (e) { return e.date === date; });
        var cell = el('div', { class: 'day adm-day ' + info.status + (date === d.today ? ' today' : '') + (S.edit && S.edit.date === date ? ' selected' : '') });
        var add = el('button', { type: 'button', class: 'day-add', 'aria-label': JG.dateLabel(date) + ' 일정 추가' }, [el('span', { class: 'n', text: String(+date.slice(8)) })]);
        add.addEventListener('click', function () { S.edit = { date: date, kind: '공연', visibility: '기관 숨김' }; shell(); focusEditor(); });
        cell.appendChild(add);
        evs.forEach(function (e) {
          var chip = el('button', { type: 'button', class: 'ev-chip' + (e.kind === '불가' ? ' block' : ''), text: e.kind === '불가' ? '불가' : (e.time ? e.time + ' ' : '') + (e.title || e.place || '공연') });
          chip.addEventListener('click', function () { S.edit = Object.assign({}, e); shell(); focusEditor(); });
          cell.appendChild(chip);
        });
        if (pending[date]) cell.appendChild(el('span', { class: 'ev-inq', text: '문의 ' + pending[date] }));
        days.appendChild(cell);
      })(day);
    }
    box.appendChild(days);
    box.appendChild(el('div', { class: 'cal-legend' }, [el('span', null, [el('i', { class: 'lg-open' }), '문의 받는 날']), el('span', null, [el('i', { class: 'lg-full' }), '공연 꽉 참']), el('span', null, [el('i', { class: 'lg-no' }), '불가·쉬는 날']), el('span', null, [el('i', { class: 'lg-inq' }), '처리 중인 문의'])]));
  }
  function focusEditor() { setTimeout(function () { var f = document.getElementById('ev-title') || document.getElementById('ev-date'); if (f) { f.focus({ preventScroll: true }); f.closest('.ev-editor').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }, 30); }
  function editor(box) {
    var e = S.edit || { date: '', kind: '공연', visibility: '기관 숨김' };
    var isNew = !e.id;
    var form = el('form', { class: 'ev-editor' });
    form.appendChild(el('h2', { text: isNew ? (e.date ? JG.dateLabel(e.date) + ' 일정 추가' : '새 일정 추가') : '일정 고치기' }));
    var date = inp({ type: 'date', id: 'ev-date', required: true }, e.date);
    var time = inp({ id: 'ev-time', placeholder: '예: 10:30', maxlength: 20 }, e.time);
    var kindBox = el('div', { class: 'opts', role: 'radiogroup', 'aria-label': '종류' }, JG.KINDS.map(function (k) {
      return el('label', { class: 'opt' }, [el('input', { type: 'radio', name: 'ev-kind', value: k, checked: e.kind === k }), el('span', { text: k === '불가' ? '불가 (문의 막기)' : '공연' })]);
    }));
    var works = S.data.works;
    var isCustom = e.title && works.indexOf(e.title) < 0;
    var sel = el('select', { class: 'inp', id: 'ev-title' }, [el('option', { value: '', text: '작품 고르기 (선택)' })].concat(works.map(function (w) { var o = el('option', { value: w, text: w }); if (w === e.title) o.selected = true; return o; }), [el('option', { value: '__custom', text: '직접 적기', selected: isCustom })]));
    var custom = inp({ id: 'ev-title-custom', placeholder: '작품이나 행사 이름', maxlength: 80, hidden: !isCustom }, isCustom ? e.title : '');
    sel.addEventListener('change', function () { custom.hidden = sel.value !== '__custom'; if (!custom.hidden) custom.focus(); });
    var place = inp({ id: 'ev-place', placeholder: '예: ○○ 직장어린이집', maxlength: 80 }, e.place);
    var region = inp({ id: 'ev-region', placeholder: '예: 해운대구', maxlength: 40 }, e.region);
    var visBox = el('div', { class: 'vis' }, JG.VIS.map(function (v) {
      var help = { '공개': '홈페이지에 작품·기관·지역이 보여요', '기관 숨김': '작품과 지역만 보이고 기관 이름은 숨겨요', '예약됨만': '"예약된 공연"으로만 보여요' }[v];
      return el('label', { class: 'vis-opt' }, [el('input', { type: 'radio', name: 'ev-vis', value: v, checked: e.visibility === v }), el('span', null, [el('b', { text: v }), el('small', { text: help })])]);
    }));
    var memo = inp({ tag: 'textarea', id: 'ev-memo', maxlength: 500, placeholder: '담당자 연락처, 준비물 등 (홈페이지에 안 보여요)' }, e.memo);
    var showFields = el('div', { class: 'ev-show', hidden: e.kind === '불가' }, [field('작품', sel), custom, field('기관·장소', place), field('지역', region), el('fieldset', { class: 'fld' }, [el('legend', { text: '홈페이지에 보이는 방식' }), visBox])]);
    kindBox.addEventListener('change', function () { showFields.hidden = form.querySelector('input[name=ev-kind]:checked').value === '불가'; });
    form.append(field('날짜', date, null, 'date'), field('시간', time), el('fieldset', { class: 'fld' }, [el('legend', { text: '종류' }), kindBox]), showFields, field('관리자 메모', memo));
    var save = el('button', { type: 'submit', class: 'btn btn-primary', text: isNew ? '일정 추가' : '고친 내용 저장' });
    var clear = el('button', { type: 'button', class: 'btn btn-ghost', text: '새로 쓰기' });
    clear.addEventListener('click', function () { S.edit = null; shell(); });
    var btns = [save, clear];
    if (!isNew) btns.push(confirmBtn('삭제', '한 번 더 누르면 삭제', function (b) {
      var done = busy(b, '삭제 중...');
      call('deleteEvent', { id: e.id }).then(function (r) { done(); if (r.ok) { toast('일정을 지웠어요.'); S.edit = null; load(); } else toast(r.message || '지우지 못했어요.', true); });
    }));
    var err = el('p', { class: 'err', role: 'alert', hidden: true });
    form.append(err, el('div', { class: 'row-btns' }, btns));
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var kind = form.querySelector('input[name=ev-kind]:checked').value;
      var title = sel.value === '__custom' ? custom.value : sel.value;
      var payload = { id: e.id || '', date: date.value, time: time.value, kind: kind, title: kind === '불가' ? '' : title, place: kind === '불가' ? '' : place.value, region: kind === '불가' ? '' : region.value, visibility: (form.querySelector('input[name=ev-vis]:checked') || {}).value || '기관 숨김', memo: memo.value };
      var done = busy(save);
      call('saveEvent', { event: payload }).then(function (r) {
        done();
        if (r.ok) { toast(isNew ? '일정을 추가했어요.' : '저장했어요.'); S.edit = r.event; S.month = JG.monthStart(r.event.date); load(); }
        else { err.hidden = false; err.textContent = r.message || '저장하지 못했어요.'; }
      });
    });
    box.appendChild(form);
  }
  function monthList(box) {
    var m = S.month, list = S.data.events.filter(function (e) { return e.date.slice(0, 7) === m.slice(0, 7); });
    var wrap = el('section', { class: 'ev-list' }, [el('h2', { text: (+m.slice(5, 7)) + '월 일정 ' + list.length + '건' })]);
    if (!list.length) wrap.appendChild(el('p', { class: 'empty', text: '이 달에는 등록된 일정이 없어요. 달력에서 날짜를 눌러 추가해 보세요.' }));
    list.forEach(function (e) {
      var b = el('button', { type: 'button', class: 'ev-row' + (S.edit && S.edit.id === e.id ? ' on' : '') }, [
        el('span', { class: 'inq-date' }, [el('b', { text: mmdd(e.date) }), JG.weekday(e.date)]),
        el('span', { class: 'inq-main' }, [el('b', { text: e.kind === '불가' ? '문의 불가' : (e.title || '작품 미정') }), el('span', { text: [e.time, e.place, e.region].filter(Boolean).join(' · ') || (e.memo || '') }), e.kind === '공연' ? el('small', { text: '홈페이지: ' + e.visibility }) : null])
      ]);
      b.addEventListener('click', function () { S.edit = Object.assign({}, e); shell(); focusEditor(); });
      wrap.appendChild(b);
    });
    box.appendChild(wrap);
  }

  /* ---------- 문의 질문 ---------- */
  function tabQuestions(main) {
    main.appendChild(el('div', { class: 'adm-head' }, [el('h1', { text: '문의 질문' }), el('p', { class: 'lead', text: '고객이 문의할 때 답하는 질문입니다. 추가·수정·순서 바꾸기를 한 뒤 아래 저장 버튼을 눌러 주세요.' })]));
    var grid = el('div', { class: 'q-grid' });
    var left = el('div', { class: 'q-edit' }), right = el('aside', { class: 'q-preview' });
    grid.append(left, right);
    main.appendChild(grid);
    left.appendChild(el('div', { class: 'fixed-q' }, [el('b', { text: '항상 묻는 기본 항목' }), el('span', { text: '희망 날짜 · 기관 이름 · 담당자 성함 · 연락처 · 개인정보 동의' }), el('small', { text: '연락에 꼭 필요해서 바꿀 수 없어요.' })]));
    var list = el('div', { class: 'q-list' });
    left.appendChild(list);
    var types = S.data.types;
    function mark() { S.dirty = true; saveBar.classList.add('dirty'); status.textContent = '저장하지 않은 변경이 있어요'; preview(); }
    function draw() {
      list.textContent = '';
      S.draft.forEach(function (q, i) {
        var label = inp({ id: 'q-label-' + i, maxlength: 100, placeholder: '질문 내용' }, q.label);
        label.addEventListener('input', function () { q.label = label.value; mark(); });
        var type = el('select', { class: 'inp', id: 'q-type-' + i }, types.map(function (t) { var o = el('option', { value: t[0], text: t[1] }); if (t[0] === q.type) o.selected = true; return o; }));
        var opts = inp({ tag: 'textarea', id: 'q-opts-' + i, placeholder: '한 줄에 하나씩 적어 주세요' }, q.options.join('\n'));
        var optWrap = field('선택지 (한 줄에 하나)', opts);
        optWrap.hidden = !(q.type === 'choice' || q.type === 'multi');
        type.addEventListener('change', function () { q.type = type.value; optWrap.hidden = !(q.type === 'choice' || q.type === 'multi'); mark(); });
        opts.addEventListener('input', function () { q.options = opts.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); mark(); });
        var help = inp({ id: 'q-help-' + i, maxlength: 200, placeholder: '예: 대략적인 인원을 적어 주세요' }, q.help);
        help.addEventListener('input', function () { q.help = help.value; mark(); });
        var req = el('input', { type: 'checkbox', id: 'q-req-' + i, checked: q.required });
        req.addEventListener('change', function () { q.required = req.checked; mark(); });
        var act = el('input', { type: 'checkbox', id: 'q-act-' + i, checked: q.active });
        act.addEventListener('change', function () { q.active = act.checked; card.classList.toggle('off', !q.active); mark(); });
        var up = el('button', { type: 'button', class: 'ctrl sm', 'aria-label': (i + 1) + '번 질문 위로', disabled: i === 0 }, [icon('ph-arrow-up')]);
        var down = el('button', { type: 'button', class: 'ctrl sm', 'aria-label': (i + 1) + '번 질문 아래로', disabled: i === S.draft.length - 1 }, [icon('ph-arrow-down')]);
        up.addEventListener('click', function () { var t = S.draft[i - 1]; S.draft[i - 1] = q; S.draft[i] = t; mark(); draw(); document.querySelector('[aria-label="' + i + '번 질문 위로"]') && document.getElementById('q-label-' + (i - 1)).focus(); });
        down.addEventListener('click', function () { var t = S.draft[i + 1]; S.draft[i + 1] = q; S.draft[i] = t; mark(); draw(); document.getElementById('q-label-' + (i + 1)).focus(); });
        var del = confirmBtn('삭제', '한 번 더 누르면 삭제', function () { S.draft.splice(i, 1); mark(); draw(); }, 'btn-ghost sm');
        var card = el('div', { class: 'q-card' + (q.active ? '' : ' off'), 'data-key': String(i) }, [
          el('div', { class: 'q-top' }, [el('span', { class: 'q-num', text: String(i + 1) }), up, down, el('div', { class: 'q-label' }, [label]), del]),
          el('div', { class: 'q-row' }, [field('유형', type), el('label', { class: 'switch', for: 'q-req-' + i }, [req, '필수']), el('label', { class: 'switch', for: 'q-act-' + i }, [act, '사용'])]),
          optWrap, field('도움말 (선택)', help), el('p', { class: 'err', hidden: true })
        ]);
        list.appendChild(card);
      });
    }
    var add = el('button', { type: 'button', class: 'btn btn-soft' }, [icon('ph-plus'), '질문 추가']);
    add.addEventListener('click', function () { S.draft.push({ id: '', label: '', type: 'short', options: [], required: false, help: '', active: true }); mark(); draw(); document.getElementById('q-label-' + (S.draft.length - 1)).focus(); });
    left.appendChild(add);
    var status = el('span', { class: 'save-status', text: S.dirty ? '저장하지 않은 변경이 있어요' : '저장된 상태예요' });
    var save = el('button', { type: 'button', class: 'btn btn-primary', text: '질문 저장' });
    var revert = el('button', { type: 'button', class: 'btn btn-ghost', text: '변경 취소' });
    revert.addEventListener('click', function () { S.dirty = false; S.draft = S.data.questions.map(function (q) { return Object.assign({}, q, { options: q.options.slice() }); }); shell(); });
    var reset = confirmBtn('기본 질문으로 되돌리기', '한 번 더 누르면 되돌림', function (b) {
      var done = busy(b, '되돌리는 중...');
      call('resetQuestions').then(function (r) { done(); if (r.ok) { S.dirty = false; S.draft = null; toast('기본 질문으로 되돌렸어요.'); load(); } else toast(r.message || '되돌리지 못했어요.', true); });
    });
    var saveBar = el('div', { class: 'save-bar' + (S.dirty ? ' dirty' : '') }, [status, el('div', { class: 'row-btns' }, [reset, revert, save])]);
    save.addEventListener('click', function () {
      list.querySelectorAll('.q-card').forEach(function (c) { c.classList.remove('bad'); var p = c.querySelector(':scope > .err'); p.hidden = true; });
      var done = busy(save);
      call('saveQuestions', { questions: S.draft }).then(function (r) {
        done();
        if (r.ok) { S.dirty = false; S.draft = null; toast('질문을 저장했어요. 홈페이지 문의 창에 바로 반영돼요.'); load(); return; }
        if (r.errors) Object.keys(r.errors).forEach(function (k) { var c = list.querySelector('[data-key="' + k + '"]'); if (c) { c.classList.add('bad'); var p = c.querySelector(':scope > .err'); p.hidden = false; p.textContent = r.errors[k]; } });
        toast(r.message || '저장하지 못했어요.', true);
        var first = list.querySelector('.q-card.bad'); if (first) first.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    });
    left.appendChild(saveBar);
    var pv = el('div', { class: 'pv-box' });
    right.append(el('h2', { text: '고객에게 보이는 모습' }), el('p', { class: 'help', text: '사용으로 켜 둔 질문만 순서대로 보여요.' }), pv);
    function preview() { var qs = S.draft.filter(function (q) { return q.active && q.label; }).map(function (q, i) { return Object.assign({}, q, { id: q.id || 'new' + i }); }); JGForm.render(pv, qs, {}, 'pv'); if (!qs.length) pv.appendChild(el('p', { class: 'empty', text: '보여 줄 질문이 없어요.' })); }
    draw(); preview();
  }

  /* ---------- 설정 ---------- */
  function tabSettings(main) {
    main.appendChild(el('div', { class: 'adm-head' }, [el('h1', { text: '설정' }), el('p', { class: 'lead', text: '문의 받는 규칙과 알림, 비밀번호를 바꿉니다.' })]));
    var vals = {}; S.data.settings.forEach(function (s) { vals[s.key] = s.value; });
    var help = {}; S.data.settings.forEach(function (s) { help[s.key] = s.help; });
    var form = el('form', { class: 'set-form' });
    var accept = el('input', { type: 'checkbox', id: 'set-accept', checked: vals.acceptInquiries === '예' });
    form.appendChild(el('div', { class: 'fld', 'data-key': 'acceptInquiries' }, [el('label', { class: 'switch big', for: 'set-accept' }, [accept, '홈페이지에서 온라인 문의 받기']), el('p', { class: 'help', text: help.acceptInquiries })]));
    var email = inp({ type: 'email', id: 'set-email', placeholder: 'name@example.com' }, vals.notifyEmail);
    form.appendChild(field('알림 받을 이메일', email, help.notifyEmail, 'notifyEmail'));
    var nums = el('div', { class: 'set-nums' });
    var maxDay = inp({ type: 'number', id: 'set-max', min: 1, max: 5 }, vals.maxPerDay);
    var lead = inp({ type: 'number', id: 'set-lead', min: 0, max: 90 }, vals.minLeadDays);
    var months = inp({ type: 'number', id: 'set-months', min: 1, max: 12 }, vals.maxMonths);
    nums.append(field('하루 최대 공연 수', maxDay, help.maxPerDay, 'maxPerDay'), field('최소 준비 기간(일)', lead, help.minLeadDays, 'minLeadDays'), field('몇 개월 앞까지', months, help.maxMonths, 'maxMonths'));
    form.appendChild(nums);
    var days = (vals.openWeekdays || '').split(',');
    var week = el('div', { class: 'opts' }, JG.WEEK.map(function (w) { return el('label', { class: 'opt' }, [el('input', { type: 'checkbox', name: 'set-week', value: w, checked: days.indexOf(w) >= 0 }), el('span', { text: w })]); }));
    form.appendChild(el('fieldset', { class: 'fld', 'data-key': 'openWeekdays' }, [el('legend', { text: '문의 받는 요일' }), week, el('p', { class: 'err', hidden: true })]));
    var notice = inp({ tag: 'textarea', id: 'set-notice', maxlength: 300 }, vals.formNotice);
    var privacy = inp({ tag: 'textarea', id: 'set-privacy', maxlength: 600 }, vals.privacyNotice);
    var site = inp({ id: 'set-site', maxlength: 200 }, vals.siteUrl);
    form.append(field('문의 안내 문구', notice, help.formNotice), field('개인정보 안내', privacy, help.privacyNotice), field('홈페이지 주소', site, help.siteUrl));
    var save = el('button', { type: 'submit', class: 'btn btn-primary', text: '설정 저장' });
    form.appendChild(el('div', { class: 'row-btns' }, [save]));
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var payload = { acceptInquiries: accept.checked ? '예' : '아니오', notifyEmail: email.value, maxPerDay: maxDay.value, minLeadDays: lead.value, maxMonths: months.value,
        openWeekdays: [].slice.call(form.querySelectorAll('input[name=set-week]:checked')).map(function (x) { return x.value; }).join(','), formNotice: notice.value, privacyNotice: privacy.value, siteUrl: site.value };
      var done = busy(save);
      call('saveSettings', { settings: payload }).then(function (r) {
        done();
        if (r.ok) { toast('설정을 저장했어요.'); load(); }
        else { JGForm.errors(form, r.errors || {}); toast(r.message || '저장하지 못했어요.', true); }
      });
    });
    var card1 = el('section', { class: 'set-card' }, [el('h2', { text: '문의 받는 규칙' }), form]);
    var cur = inp({ type: 'password', id: 'pw-cur', autocomplete: 'current-password' }), nw = inp({ type: 'password', id: 'pw-new', autocomplete: 'new-password' }), nw2 = inp({ type: 'password', id: 'pw-new2', autocomplete: 'new-password' });
    var pwBtn = el('button', { type: 'submit', class: 'btn btn-primary', text: '비밀번호 바꾸기' });
    var pwForm = el('form', { class: 'set-form' }, [el('input', { type: 'text', name: 'username', value: 'admin', autocomplete: 'username', hidden: true }), field('지금 비밀번호', cur, null, 'current'), field('새 비밀번호 (8자 이상)', nw, null, 'next'), field('한 번 더 입력', nw2, null, 'next2'), el('div', { class: 'row-btns' }, [pwBtn])]);
    pwForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (nw.value !== nw2.value) { JGForm.errors(pwForm, { next2: '두 비밀번호가 서로 달라요' }); return; }
      var done = busy(pwBtn, '바꾸는 중...');
      call('changePassword', { current: cur.value, next: nw.value }).then(function (r) { done(); if (r.ok) { toast('비밀번호를 바꿨어요.'); pwForm.reset(); JGForm.errors(pwForm, {}); } else JGForm.errors(pwForm, r.errors || { current: r.message }); });
    });
    var card2 = el('section', { class: 'set-card' }, [el('h2', { text: '관리자 비밀번호' }), pwForm]);
    var info = el('section', { class: 'set-card' }, [el('h2', { text: '연결 정보' }),
      el('p', { text: api.mode === 'preview' ? '지금은 미리보기 모드라서 이 컴퓨터 브라우저에만 저장돼요. 실제 문의는 구글 시트를 연결한 뒤 받습니다.' : '구글 시트에 저장되고 있어요. 시트를 직접 열어 보거나 고칠 수도 있어요.' }),
      api.mode === 'live' ? el('p', { class: 'help', text: '연결 주소: ' + (api.config.apiUrl || '') }) : null]);
    if (api.mode === 'preview') info.appendChild(confirmBtn('미리보기 자료 모두 지우기', '한 번 더 누르면 지움', function () { api.resetPreview(); tokenSet(null); S.data = null; S.draft = null; toast('미리보기 자료를 지웠어요.'); login(); }));
    main.appendChild(el('div', { class: 'set-grid' }, [card1, el('div', { class: 'set-col' }, [card2, info])]));
  }

  window.addEventListener('beforeunload', function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });
  boot();
})();
