/* 공연 일정 달력 + 빈 날짜 문의 창 */
(function () {
  'use strict';
  var box = document.querySelector('[data-schedule]');
  if (!box || !window.JG || !window.JGApi) return;
  var el = JGForm.el, api = JGApi, cfg = api.config || {};
  var PHONE = cfg.phone || '010-3837-8479', TEL = PHONE.replace(/\D/g, '');
  var DEFAULTS = JG.parseSettings({});
  var data = null, month = null, minMonth = null, maxMonth = null;
  var daysBox = box.querySelector('[data-cal-days]'), title = box.querySelector('[data-cal-title]');
  var prevBtn = box.querySelector('[data-cal-prev]'), nextBtn = box.querySelector('[data-cal-next]');
  var note = box.querySelector('[data-cal-note]'), upList = box.querySelector('[data-upcoming]');

  function kstToday() {
    var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    return p.slice(0, 10);
  }
  function monthLabel(m) { return m.slice(0, 4) + '년 ' + (+m.slice(5, 7)) + '월'; }

  function load() {
    skeleton();
    api.call('public').then(function (r) {
      if (!r || !r.ok) {
        data = { today: kstToday(), settings: DEFAULTS, questions: JG.QUESTIONS.filter(function (q) { return q.active; }), events: [], offline: true, reason: r && r.code };
      } else data = r;
      data.settings = JG.parseSettings(Object.assign({}, data.settings, { openWeekdays: (data.settings.openWeekdays || []).join(','), acceptInquiries: data.settings.acceptInquiries ? '예' : '아니오' }));
      minMonth = JG.monthStart(data.today);
      maxMonth = JG.monthStart(JG.addMonths(data.today, data.settings.maxMonths));
      if (!month || month < minMonth || month > maxMonth) month = minMonth;
      draw(false);
      upcoming();
      if (data.offline) note.textContent = api.mode === 'off' || data.reason === 'off'
        ? '온라인 일정 연결 전이에요. 날짜를 고르면 문의 내용을 문자로 보낼 수 있고, 일정은 전화로 다시 확인해 드려요.'
        : '일정을 불러오지 못했어요. 날짜를 골라 문자로 문의하시거나 ' + PHONE + '로 전화 주세요.';
      else note.textContent = '초록색 날짜를 누르면 문의 창이 열려요. 오늘부터 ' + data.settings.minLeadDays + '일 뒤 날짜부터 문의할 수 있어요.';
    });
  }
  function skeleton() {
    daysBox.textContent = '';
    for (var i = 0; i < 35; i++) daysBox.appendChild(el('div', { class: 'skel', 'aria-hidden': 'true' }));
  }

  function draw(animate) {
    var paint = function () {
      title.textContent = monthLabel(month);
      prevBtn.disabled = month <= minMonth;
      nextBtn.disabled = month >= maxMonth;
      daysBox.textContent = '';
      var first = JG.weekday(month), lead = JG.WEEK.indexOf(first);
      for (var i = 0; i < lead; i++) daysBox.appendChild(el('div', { class: 'day pad', 'aria-hidden': 'true' }));
      var d = month;
      while (d.slice(0, 7) === month.slice(0, 7)) {
        daysBox.appendChild(cell(d));
        d = JG.addDays(d, 1);
      }
      if (animate) { daysBox.classList.remove('swap-out'); daysBox.classList.add('swap-in'); setTimeout(function () { daysBox.classList.remove('swap-in'); }, 160); }
    };
    if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) { daysBox.classList.add('swap-out'); setTimeout(paint, 60); } else paint();
  }
  function cell(d) {
    var info = JG.dayInfo(d, data.events, data.settings, data.today);
    var day = +d.slice(8), st = info.status;
    var label = JG.STATUS_TEXT[st];
    if (st === 'full' || (st === 'open' && info.shows.length)) {
      var named = info.shows.filter(function (e) { return e.title; })[0];
      if (st === 'full') label = named ? named.title : '공연 있음';
      else label = '문의 가능';
    }
    var cls = 'day ' + st + (d === data.today ? ' today' : '');
    var kids = [el('span', { class: 'n', text: String(day) }), el('span', { class: 's', text: st === 'past' ? '' : label })];
    var aria = JG.dateLabel(d) + ', ' + (st === 'full' ? '공연 있음' + (label !== '공연 있음' ? ' (' + label + ')' : '') : JG.STATUS_TEXT[st]);
    if (st === 'open') {
      var b = el('button', { type: 'button', class: cls, 'data-date': d, 'aria-label': aria + ', 눌러서 문의하기' }, kids);
      b.addEventListener('click', function () { Ask.open(d, b); });
      return b;
    }
    return el('div', { class: cls, 'aria-label': aria, role: 'img' }, kids);
  }
  prevBtn.addEventListener('click', function () { if (month > minMonth) { month = JG.addMonths(month, -1); draw(true); } });
  nextBtn.addEventListener('click', function () { if (month < maxMonth) { month = JG.addMonths(month, 1); draw(true); } });

  function upcoming() {
    upList.textContent = '';
    var list = data.events.filter(function (e) { return e.kind === '공연' && e.date >= data.today; }).slice(0, 6);
    if (!list.length) {
      upList.appendChild(el('li', { class: 'empty', style: 'display:block' }, [data.offline ? '공연 일정은 전화로 안내해 드려요.' : '아직 공개된 공연 일정이 없어요. 원하는 날짜를 골라 먼저 문의해 주세요.']));
      return;
    }
    list.forEach(function (e) {
      var sub = [e.time, e.place || e.region].filter(Boolean).join(' · ');
      upList.appendChild(el('li', null, [
        el('div', { class: 'up-date' }, [el('b', { text: e.date.slice(5).replace('-', '.') }), JG.weekday(e.date) + '요일']),
        el('div', null, [el('div', { class: 'up-title', text: e.hidden || !e.title ? '예약된 공연' : e.title }), sub && !e.hidden ? el('div', { class: 'up-sub', text: sub }) : null])
      ]));
    });
  }

  /* ---------- 문의 창 ---------- */
  var Ask = (function () {
    var dlg, body, foot, steps, backBtn, nextBtn2, opener;
    var st = { date: '', step: 1, contact: { org: '', name: '', phone: '' }, answers: {}, started: 0, agree: false };
    function build() {
      dlg = el('dialog', { class: 'ask-dialog', id: 'ask', 'aria-labelledby': 'ask-title' });
      var shell = el('div', { class: 'ask-shell' });
      var top = el('div', { class: 'ask-top' }, [el('h2', { id: 'ask-title', text: '공연 문의' }), el('button', { type: 'button', class: 'ask-close', 'aria-label': '문의 창 닫기' }, [el('i', { class: 'ph ph-x' })])]);
      steps = el('div', { class: 'steps', 'aria-hidden': 'true' }, [
        el('div', { class: 'st' }, [el('i'), el('span', { text: '기관·연락처' })]), el('div', { class: 'bar' }, [el('b')]),
        el('div', { class: 'st' }, [el('i'), el('span', { text: '공연 내용' })]), el('div', { class: 'bar' }, [el('b')]),
        el('div', { class: 'st' }, [el('i'), el('span', { text: '확인·보내기' })])
      ]);
      body = el('div', { class: 'ask-body' });
      backBtn = el('button', { type: 'button', class: 'btn btn-ghost', text: '이전' });
      nextBtn2 = el('button', { type: 'button', class: 'btn btn-primary' });
      foot = el('div', { class: 'ask-foot' }, [backBtn, nextBtn2]);
      shell.append(top, steps, body, foot);
      dlg.appendChild(shell);
      document.body.appendChild(dlg);
      top.querySelector('.ask-close').addEventListener('click', function () { dlg.close(); });
      dlg.addEventListener('close', function () { if (opener) opener.focus(); });
      backBtn.addEventListener('click', function () { keep(); show(st.step - 1); });
      nextBtn2.addEventListener('click', forward);
    }
    function open(date, from) {
      if (!dlg) build();
      opener = from;
      if (st.date !== date) { st.date = date; }
      if (!st.started) st.started = Date.now();
      if (st.step > 3) { st.step = 1; st.answers = {}; st.agree = false; st.started = Date.now(); }
      dlg.showModal();
      show(st.step);
    }
    function stepUI(n) {
      var s = steps.querySelectorAll('.st'), b = steps.querySelectorAll('.bar');
      s.forEach(function (x, i) { x.classList.toggle('on', i + 1 === n); x.classList.toggle('done', i + 1 < n); });
      b.forEach(function (x, i) { x.classList.toggle('done', i + 1 < n); });
      steps.hidden = n > 3;
      backBtn.hidden = n === 1 || n > 3;
      foot.hidden = false;
      nextBtn2.textContent = n === 3 ? (offline() ? '문자로 보내기' : '문의 보내기') : n > 3 ? '닫기' : '다음';
    }
    function offline() { return data.offline; }
    function show(n) {
      st.step = n;
      body.textContent = '';
      var pane = el('div', { class: 'ask-pane swap-in' });
      if (n === 1) paneContact(pane);
      if (n === 2) paneQuestions(pane);
      if (n === 3) paneReview(pane);
      body.appendChild(pane);
      body.scrollTop = 0;
      stepUI(n);
      var f = pane.querySelector('input:not([type=hidden]):not(.hp input), textarea');
      if (f && n < 4) setTimeout(function () { f.focus({ preventScroll: true }); }, 30);
    }
    function paneContact(p) {
      var change = el('button', { type: 'button', class: 'linkish', text: '다른 날짜 고르기' });
      change.addEventListener('click', function () { keep(); dlg.close(); var t = document.querySelector('#schedule'); if (t) t.scrollIntoView({ behavior: 'smooth' }); });
      p.appendChild(el('div', { class: 'date-pill' }, [el('span', { text: '희망 날짜' }), el('b', { text: JG.dateLabel(st.date) }), change]));
      if (data.settings.formNotice) p.appendChild(el('p', { class: 'notice', text: data.settings.formNotice }));
      [['org', '기관 이름', 'organization', '예: 부산○○ 직장어린이집'], ['name', '담당자 성함', 'name', ''], ['phone', '연락처', 'tel', '010-0000-0000']].forEach(function (f) {
        var id = 'ac-' + f[0];
        var input = el('input', { id: id, class: 'inp', name: f[0], type: f[0] === 'phone' ? 'tel' : 'text', autocomplete: f[2], placeholder: f[3] || null, required: true, maxlength: f[0] === 'org' ? 80 : 30, 'aria-describedby': id + '-err' });
        input.value = st.contact[f[0]] || '';
        p.appendChild(el('div', { class: 'fld', 'data-key': f[0] }, [el('label', { for: id }, [f[1], el('span', { class: 'req', 'aria-hidden': 'true', text: '*' })]), input, el('p', { class: 'err', id: id + '-err', hidden: true })]));
      });
      p.appendChild(el('div', { class: 'hp', 'aria-hidden': 'true' }, [el('label', { for: 'ac-website', text: '비워 두세요' }), el('input', { id: 'ac-website', name: 'website', tabindex: '-1', autocomplete: 'off' })]));
    }
    function paneQuestions(p) {
      var qbox = el('div', { class: 'ask-pane' });
      JGForm.render(qbox, data.questions, st.answers, 'aq');
      if (!data.questions.length) qbox.appendChild(el('p', { class: 'notice', text: '추가로 여쭐 내용이 없어요. 다음으로 넘어가 주세요.' }));
      p.appendChild(qbox);
    }
    function paneReview(p) {
      var rows = [['희망 날짜', JG.dateLabel(st.date)], ['기관', st.contact.org], ['담당자', st.contact.name], ['연락처', st.contact.phone]];
      data.questions.forEach(function (q) { var v = JG.answerText(st.answers[q.id]); if (v) rows.push([q.label, v]); });
      p.appendChild(el('dl', { class: 'review' }, rows.map(function (r) { return el('div', null, [el('dt', { text: r[0] }), el('dd', { text: r[1] })]); })));
      if (data.settings.privacyNotice) p.appendChild(el('p', { class: 'privacy', text: data.settings.privacyNotice }));
      var cb = el('input', { type: 'checkbox', id: 'ac-agree', checked: st.agree, 'aria-describedby': 'ac-agree-err' });
      cb.addEventListener('change', function () { st.agree = cb.checked; });
      p.appendChild(el('div', { class: 'fld', 'data-key': 'agree' }, [el('label', { class: 'agree', for: 'ac-agree' }, [cb, '개인정보 수집·이용에 동의합니다 (필수)']), el('p', { class: 'err', id: 'ac-agree-err', hidden: true })]));
      if (offline()) p.appendChild(el('p', { class: 'notice', text: '지금은 온라인으로 접수할 수 없어 문자로 문의를 받아요. 다음 화면에서 "문자 앱 열기"를 누르면 내용이 담긴 문자 창이 열려요.' }));
      p.appendChild(el('p', { class: 'err', id: 'ac-send-err', hidden: true, role: 'alert' }));
    }
    function keep() {
      if (st.step === 1) ['org', 'name', 'phone'].forEach(function (k) { var i = body.querySelector('#ac-' + k); if (i) st.contact[k] = i.value; });
      if (st.step === 2) st.answers = JGForm.read(body, data.questions, 'aq');
    }
    function forward() {
      if (st.step > 3) { dlg.close(); return; }
      keep();
      if (st.step === 1) {
        var c = JG.checkContact(st.contact);
        if (JGForm.errors(body, c.errors)) return;
        show(2); return;
      }
      if (st.step === 2) {
        var errs = {};
        data.questions.forEach(function (q) { var r = JG.checkAnswer(q, st.answers[q.id]); if (r.error) errs[q.id] = r.error; });
        if (JGForm.errors(body, errs)) return;
        show(3); return;
      }
      if (!st.agree) { JGForm.errors(body, { agree: '개인정보 수집·이용에 동의해 주세요' }); return; }
      send();
    }
    function smsText() {
      var lines = ['[아동극단 징검다리 공연 문의]', '희망 날짜: ' + JG.dateLabel(st.date), '기관: ' + st.contact.org, '담당자: ' + st.contact.name, '연락처: ' + st.contact.phone];
      data.questions.forEach(function (q) { var v = JG.answerText(st.answers[q.id]); if (v) lines.push(q.label + ': ' + v); });
      return lines.join('\n');
    }
    function send() {
      var errP = body.querySelector('#ac-send-err');
      if (offline()) { done(null, smsText()); return; }
      nextBtn2.disabled = true; nextBtn2.textContent = '보내는 중...';
      var hp = (document.getElementById('ac-website') || {}).value || '';
      api.call('inquire', { date: st.date, org: st.contact.org, name: st.contact.name, phone: st.contact.phone, answers: st.answers, agree: true, website: hp, elapsed: Date.now() - st.started })
        .then(function (r) {
          nextBtn2.disabled = false;
          if (r.ok) { done(r.id); load(); return; }
          if (r.code === 'invalid' && r.errors) {
            var contactKeys = ['org', 'name', 'phone'];
            var onFirst = Object.keys(r.errors).some(function (k) { return contactKeys.indexOf(k) >= 0; });
            if (onFirst) { show(1); JGForm.errors(body, r.errors); } else if (!r.errors.agree) { show(2); JGForm.errors(body, r.errors); } else { stepUI(3); JGForm.errors(body, r.errors); }
            return;
          }
          stepUI(3);
          errP.hidden = false;
          errP.textContent = (r.message || '보내지 못했어요.') + (r.code === 'network' || r.code === 'error' ? ' 아래 버튼으로 문자 문의도 할 수 있어요.' : '');
          if (r.code === 'date') load();
          if (r.code === 'network' || r.code === 'error' || r.code === 'busy') { data.offline = true; nextBtn2.textContent = '문자로 보내기'; }
        });
    }
    function done(id, text) {
      st.step = 4;
      body.textContent = '';
      var p = el('div', { class: 'ask-pane swap-in' });
      var d = el('div', { class: 'done-box' }, [el('div', { class: 'done-stones', 'aria-hidden': 'true' }, [el('span'), el('span'), el('span')])]);
      if (id) {
        d.append(el('h3', { text: '문의가 접수되었어요' }), el('p', { text: JG.dateLabel(st.date) + ' 공연 문의를 잘 받았어요. 내용을 확인한 뒤 ' + st.contact.phone + '로 연락드릴게요.' }), el('p', { class: 'notice', text: '접수 번호 ' + id }));
      } else {
        var href = 'sms:' + TEL + '?&body=' + encodeURIComponent(text);
        d.append(el('h3', { text: '문자로 보내 주세요' }), el('p', { text: '아래 버튼을 누르면 내용이 담긴 문자 창이 열려요. 컴퓨터라면 내용을 복사해 ' + PHONE + '로 보내 주세요.' }),
          el('a', { class: 'btn btn-primary', href: href }, [el('i', { class: 'ph ph-chat-text' }), '문자 앱 열기']),
          el('div', { class: 'copy-box', text: text }));
      }
      p.appendChild(d);
      body.appendChild(p);
      stepUI(4);
      nextBtn2.focus();
    }
    return { open: open };
  })();

  window.addEventListener('pageshow', function (e) { if (e.persisted) load(); });
  load();
})();
