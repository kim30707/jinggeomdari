/* 아동극단 징검다리 · 공연 일정·문의·작품·사진 공통 규칙
   홈페이지(미리보기)와 구글 Apps Script 서버가 똑같은 이 코드를 씁니다. */
var JG = (function () {
  'use strict';

  var WEEK = ['일', '월', '화', '수', '목', '금', '토'];
  var TYPES = [['short', '짧은 글'], ['long', '긴 글'], ['choice', '하나 고르기'], ['multi', '여러 개 고르기'], ['number', '숫자'], ['date', '날짜'], ['email', '이메일']];
  var STATUSES = ['새 문의', '연락함', '확정', '불가·취소'];
  var KINDS = ['공연', '불가'];
  var VIS = ['공개', '기관 숨김', '예약됨만'];
  var ARTS = ['art-sun', 'art-sky', 'art-leaf'];
  var WORKS = ['심술꾼 로보와 꿀꿀이 삼총사', '은혜갚은 호랑이', '용궁으로 간 토끼', '삐뚤빼뚤의 안전일기', '꼬리뽑힌 호랑이', '팥죽할멈', '배탈난 호랑이', '안돼요 안돼! (성폭력 예방 인형극)'];

  var SETTINGS = [
    ['acceptInquiries', '문의 받기', '예', '끄면(시트에서는 아니오) 홈페이지 달력에서 온라인 문의를 받지 않습니다'],
    ['notifyEmail', '알림 받을 이메일', '', '새 문의가 오면 이 주소로 메일을 보냅니다'],
    ['maxPerDay', '하루 최대 공연 수', '1', '이 수만큼 공연이 잡힌 날은 문의를 받지 않습니다'],
    ['openWeekdays', '문의 받는 요일', '월,화,수,목,금,토', '쉼표로 구분합니다'],
    ['minLeadDays', '최소 준비 기간(일)', '7', '오늘부터 며칠 뒤 날짜부터 문의를 받습니다'],
    ['maxMonths', '몇 개월 앞까지', '6', '달력에 보여 주고 문의를 받는 기간'],
    ['formNotice', '문의 안내 문구', '희망 날짜를 고르고 몇 가지만 알려 주시면, 확인 후 연락드립니다.', '문의 창 맨 위에 보이는 문장'],
    ['privacyNotice', '개인정보 안내', '수집 항목: 기관명, 담당자 성함, 연락처, 문의 내용\n이용 목적: 공연 문의 상담과 일정 안내\n보관 기간: 문의일로부터 1년 뒤 삭제', '문의 마지막 단계의 동의 문구'],
    ['siteUrl', '홈페이지 주소', 'https://kim30707.github.io/jinggeomdari', '알림 메일에 넣을 관리자 페이지 주소의 기준']
  ];

  var QUESTIONS = [
    { id: 'q-type', label: '기관 종류', type: 'choice', options: ['유치원', '어린이집', '초등학교', '중학교', '도서관·복지관', '지역 축제·행사', '기타'], required: true, help: '', active: true },
    { id: 'q-time', label: '희망 시간', type: 'choice', options: ['오전', '오후', '상관없음'], required: true, help: '', active: true },
    { id: 'q-count', label: '관람 인원', type: 'number', options: [], required: true, help: '대략적인 인원을 숫자로 적어 주세요 (명)', active: true },
    { id: 'q-age', label: '관람 연령', type: 'multi', options: ['만 3~5세 (유아)', '초등 1~2학년', '초등 3~6학년', '중학생 이상', '가족·성인'], required: true, help: '여러 개 고를 수 있어요', active: true },
    { id: 'q-play', label: '희망 작품', type: 'choice', options: WORKS.concat(['추천해 주세요']), required: false, help: '', active: true },
    { id: 'q-venue', label: '공연 장소', type: 'choice', options: ['실내 강당·체육관', '교실·유희실', '공연장', '야외 무대', '아직 모름'], required: true, help: '', active: true },
    { id: 'q-addr', label: '공연 장소 주소', type: 'short', options: [], required: true, help: '예: 부산 기장군 기장읍 차성로 12', active: true },
    { id: 'q-budget', label: '공연비 예산', type: 'choice', options: ['기관 자체 예산', '교육청·지자체 지원 사업', '아직 정하지 않음'], required: false, help: '', active: true },
    { id: 'q-email', label: '견적서 받을 이메일', type: 'email', options: [], required: false, help: '견적서나 공문이 필요하시면 적어 주세요', active: true },
    { id: 'q-etc', label: '그 밖에 알려 주실 내용', type: 'long', options: [], required: false, help: '행사 이름, 공연 목적, 주차 안내 등', active: true }
  ];

  var SCHEMA = {
    events: { sheet: '공연일정', cols: [['id', '번호'], ['date', '날짜'], ['time', '시간'], ['kind', '종류'], ['title', '작품'], ['place', '기관·장소'], ['region', '지역'], ['visibility', '공개 방식'], ['memo', '관리자 메모'], ['createdAt', '등록일시']] },
    inquiries: { sheet: '문의', cols: [['id', '번호'], ['createdAt', '접수일시'], ['date', '희망 날짜'], ['org', '기관명'], ['name', '담당자'], ['phone', '연락처'], ['status', '상태'], ['memo', '관리자 메모'], ['summary', '문의 내용'], ['eventId', '연결된 일정'], ['answers', '답변 원본(고치지 마세요)']] },
    questions: { sheet: '문의 질문', cols: [['id', '번호'], ['order', '순서'], ['label', '질문'], ['type', '유형'], ['options', '선택지(줄마다 하나)'], ['required', '필수'], ['help', '도움말'], ['active', '사용']] },
    settings: { sheet: '설정', cols: [['key', '항목'], ['label', '설명'], ['value', '값']] },
    works: { sheet: '작품', cols: [['id', '번호'], ['order', '순서'], ['title', '제목'], ['badge', '표시(예: 2026 신작)'], ['sub', '부제'], ['genre', '장르(쉼표로 나눔)'], ['time', '공연 시간'], ['line', '한 줄 소개'], ['story', '줄거리(빈 줄로 문단 나눔)'], ['points', '아이들과 나누는 이야기(줄마다)'], ['theme', '주제'], ['note', '덧붙이는 말'], ['art', '사진 없을 때 색'], ['featured', '크게 보이기'], ['active', '공개'], ['updatedAt', '고친 날']] },
    photos: { sheet: '사진', cols: [['id', '번호'], ['workId', '작품 번호'], ['order', '순서'], ['caption', '사진 설명'], ['src', '사진 위치(고치지 마세요)'], ['home', '홈 사진 모음'], ['createdAt', '등록일시']] }
  };
  var MAX_PHOTOS = 30, MAX_WORKS = 30;

  /* ---------- 작은 도구 ---------- */
  function str(v) { return v == null ? '' : String(v); }
  function clean(v, max) {
    var s = str(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\r\n?/g, '\n').trim();
    return max ? s.slice(0, max) : s;
  }
  function yes(v) { var s = str(v).trim().toLowerCase(); return s === '예' || s === 'true' || s === 'y' || s === 'yes' || s === 'o' || s === '1'; }
  function yn(b) { return b ? '예' : '아니오'; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function typeKey(v) { var s = str(v).trim(); for (var i = 0; i < TYPES.length; i++) if (TYPES[i][0] === s || TYPES[i][1] === s) return TYPES[i][0]; return 'short'; }
  function typeLabel(k) { for (var i = 0; i < TYPES.length; i++) if (TYPES[i][0] === k) return TYPES[i][1]; return '짧은 글'; }
  function fail(code, message, extra) { var o = { ok: false, code: code, message: message }; if (extra) for (var k in extra) o[k] = extra[k]; return o; }

  /* ---------- 날짜 (모두 'YYYY-MM-DD' 글자로 다룹니다) ---------- */
  function normDate(v) {
    var m = str(v).trim().match(/^(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})/);
    if (!m) return '';
    var y = +m[1], mo = +m[2], d = +m[3];
    var t = new Date(Date.UTC(y, mo - 1, d));
    if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return '';
    return y + '-' + pad(mo) + '-' + pad(d);
  }
  function toUTC(s) { var p = s.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function fromUTC(t) { return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()); }
  function addDays(s, n) { var t = toUTC(s); t.setUTCDate(t.getUTCDate() + n); return fromUTC(t); }
  function addMonths(s, n) {
    var t = toUTC(s), d = t.getUTCDate();
    var r = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + n, 1));
    var last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
    r.setUTCDate(Math.min(d, last));
    return fromUTC(r);
  }
  function weekday(s) { return WEEK[toUTC(s).getUTCDay()]; }
  function monthStart(s) { return s.slice(0, 8) + '01'; }
  function dateLabel(s) { var p = s.split('-'); return (+p[1]) + '월 ' + (+p[2]) + '일 (' + weekday(s) + ')'; }

  /* ---------- 저장 형식 바꾸기 ---------- */
  function toQuestion(r) {
    return { id: str(r.id).trim(), order: +r.order || 0, label: clean(r.label, 100), type: typeKey(r.type), options: str(r.options).split('\n').map(function (x) { return x.trim(); }).filter(Boolean), required: yes(r.required), help: clean(r.help, 200), active: r.active === undefined || r.active === '' ? true : yes(r.active) };
  }
  function fromQuestion(q, i) {
    return { id: q.id, order: str(i + 1), label: q.label, type: typeLabel(q.type), options: (q.options || []).join('\n'), required: yn(q.required), help: q.help || '', active: yn(q.active) };
  }
  function toEvent(r) {
    var kind = KINDS.indexOf(str(r.kind).trim()) >= 0 ? str(r.kind).trim() : '공연';
    var vis = VIS.indexOf(str(r.visibility).trim()) >= 0 ? str(r.visibility).trim() : '기관 숨김';
    return { id: str(r.id).trim(), date: normDate(r.date), time: clean(r.time, 20), kind: kind, title: clean(r.title, 80), place: clean(r.place, 80), region: clean(r.region, 40), visibility: vis, memo: clean(r.memo, 500), createdAt: str(r.createdAt) };
  }
  function toInquiry(r) {
    var answers = [];
    try { answers = JSON.parse(str(r.answers) || '[]'); } catch (e) { answers = []; }
    if (!Array.isArray(answers)) answers = [];
    var st = STATUSES.indexOf(str(r.status).trim()) >= 0 ? str(r.status).trim() : '새 문의';
    return { id: str(r.id).trim(), createdAt: str(r.createdAt), date: normDate(r.date), org: str(r.org), name: str(r.name), phone: str(r.phone), status: st, memo: str(r.memo), summary: str(r.summary), eventId: str(r.eventId), answers: answers };
  }
  function fromInquiry(q) {
    var o = {};
    SCHEMA.inquiries.cols.forEach(function (c) { o[c[0]] = c[0] === 'answers' ? JSON.stringify(q.answers || []) : str(q[c[0]]); });
    return o;
  }
  function lines(v, max, n) { return str(v).split('\n').map(function (x) { return clean(x, max); }).filter(Boolean).slice(0, n || 20); }
  function paras(v) { return str(v).replace(/\r\n?/g, '\n').split(/\n\s*\n/).map(function (x) { return clean(x.replace(/\s*\n\s*/g, ' '), 1500); }).filter(Boolean).slice(0, 12); }
  function toWork(r) {
    return {
      id: str(r.id).trim(), order: +r.order || 0, title: clean(r.title, 80), badge: clean(r.badge, 30), sub: clean(r.sub, 40),
      genre: (Array.isArray(r.genre) ? r.genre : str(r.genre).split(/[,\n]/)).map(function (x) { return clean(x, 30); }).filter(Boolean).slice(0, 4),
      time: clean(r.time, 20), line: clean(r.line, 160),
      story: Array.isArray(r.story) ? r.story.map(function (x) { return clean(x, 1500); }).filter(Boolean) : paras(r.story),
      points: Array.isArray(r.points) ? r.points.map(function (x) { return clean(x, 80); }).filter(Boolean).slice(0, 6) : lines(r.points, 80, 6),
      theme: clean(r.theme, 80), note: clean(r.note, 300), art: ARTS.indexOf(str(r.art).trim()) >= 0 ? str(r.art).trim() : '',
      featured: r.featured === true || yes(r.featured), active: r.active === undefined || r.active === '' ? true : (r.active === true || yes(r.active)), updatedAt: str(r.updatedAt)
    };
  }
  function fromWork(w) {
    return { id: w.id, order: str(w.order), title: w.title, badge: w.badge, sub: w.sub, genre: w.genre.join(', '), time: w.time, line: w.line, story: w.story.join('\n\n'), points: w.points.join('\n'), theme: w.theme, note: w.note, art: w.art, featured: yn(w.featured), active: yn(w.active), updatedAt: w.updatedAt };
  }
  function toPhoto(r) { return { id: str(r.id).trim(), workId: str(r.workId).trim(), order: +r.order || 0, caption: clean(r.caption, 120), src: str(r.src).trim(), home: r.home === true || yes(r.home), createdAt: str(r.createdAt) }; }
  function fromPhoto(p) { return { id: p.id, workId: p.workId, order: str(p.order), caption: p.caption, src: p.src, home: yn(p.home), createdAt: p.createdAt }; }
  function workName(w) { return w.sub ? w.title + ' (' + w.sub + ')' : w.title; }
  /* 사진 위치 → 주소. img:robo-1 (홈페이지 안 사진) · drive:파일번호 (관리자가 올린 사진) · data: (미리보기) */
  function photoUrl(src, size, root) {
    src = str(src);
    if (src.indexOf('drive:') === 0) return 'https://lh3.googleusercontent.com/d/' + src.slice(6) + '=w' + (size > 800 ? 1600 : 800);
    if (src.indexOf('img:') === 0) return (root || '') + 'img/' + src.slice(4) + '-' + (size > 800 ? 1600 : 800) + '.webp';
    if (/^data:image\//.test(src)) return src;
    return '';
  }
  function fromEvent(e) { var o = {}; SCHEMA.events.cols.forEach(function (c) { o[c[0]] = str(e[c[0]]); }); return o; }

  /* ---------- 읽기 ---------- */
  function readSettings(env) {
    var map = {};
    env.store.read('settings').forEach(function (r) { map[str(r.key).trim()] = str(r.value); });
    var s = {};
    SETTINGS.forEach(function (d) { s[d[0]] = map.hasOwnProperty(d[0]) ? map[d[0]] : d[2]; });
    return parseSettings(s);
  }
  function parseSettings(s) {
    function num(v, lo, hi, def) { var n = parseInt(str(v).replace(/[^\d]/g, ''), 10); if (isNaN(n)) n = def; return Math.max(lo, Math.min(hi, n)); }
    var days = str(s.openWeekdays).split(/[,\s·]+/).map(function (x) { return x.replace('요일', '').trim(); }).filter(function (x) { return WEEK.indexOf(x) >= 0; });
    return {
      acceptInquiries: s.acceptInquiries === true || yes(s.acceptInquiries),
      notifyEmail: clean(s.notifyEmail, 120),
      maxPerDay: num(s.maxPerDay, 1, 5, 1),
      openWeekdays: days,
      minLeadDays: num(s.minLeadDays, 0, 90, 7),
      maxMonths: num(s.maxMonths, 1, 12, 6),
      formNotice: clean(s.formNotice, 300),
      privacyNotice: clean(s.privacyNotice, 600),
      siteUrl: clean(s.siteUrl, 200)
    };
  }
  function readQuestions(env) {
    return env.store.read('questions').map(toQuestion).filter(function (q) { return q.id && q.label; }).sort(function (a, b) { return a.order - b.order; });
  }
  function readEvents(env) {
    return env.store.read('events').map(toEvent).filter(function (e) { return e.date; }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time < b.time ? -1 : 1); });
  }
  function readWorks(env) {
    return env.store.read('works').map(toWork).filter(function (w) { return w.id && w.title; }).sort(function (a, b) { return a.order - b.order; });
  }
  function readPhotos(env) {
    return env.store.read('photos').map(toPhoto).filter(function (p) { return p.id && p.src; }).sort(function (a, b) { return a.order - b.order; });
  }
  function workTitles(env) {
    var ws = readWorks(env).filter(function (w) { return w.active; }).map(workName);
    return ws.length ? ws : WORKS.slice();
  }
  function readInquiries(env) {
    return env.store.read('inquiries').map(toInquiry).filter(function (q) { return q.id; }).sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  }

  /* ---------- 날짜별 상태 ---------- */
  // past 지난 날 · blocked 극단 사정 · full 공연이 꽉 참 · soon 준비 기간 부족 · far 너무 먼 날 · closed 쉬는 요일 · off 문의 중단 · open 문의 가능
  function dayInfo(date, events, s, today) {
    var shows = [], blocked = false;
    for (var i = 0; i < events.length; i++) {
      if (events[i].date !== date) continue;
      if (events[i].kind === '불가') blocked = true; else shows.push(events[i]);
    }
    var st;
    if (date < today) st = 'past';
    else if (blocked) st = 'blocked';
    else if (shows.length >= s.maxPerDay) st = 'full';
    else if (date < addDays(today, s.minLeadDays)) st = 'soon';
    else if (date > addMonths(today, s.maxMonths)) st = 'far';
    else if (s.openWeekdays.indexOf(weekday(date)) < 0) st = 'closed';
    else if (!s.acceptInquiries) st = 'off';
    else st = 'open';
    return { status: st, shows: shows, blocked: blocked };
  }
  var STATUS_TEXT = { past: '지난 날', blocked: '불가', full: '공연 있음', soon: '전화 문의', far: '준비 중', closed: '쉬는 날', off: '문의 중단', open: '문의 가능' };

  function publicEvent(e) {
    if (e.kind === '불가') return { date: e.date, kind: '불가' };
    if (e.visibility === '예약됨만') return { date: e.date, kind: '공연', hidden: true };
    var o = { date: e.date, kind: '공연', time: e.time, title: e.title, region: e.region };
    if (e.visibility === '공개') o.place = e.place;
    return o;
  }

  /* ---------- 답변 확인 ---------- */
  function checkAnswer(q, v) {
    var empty = { value: '' };
    if (q.type === 'multi') {
      var arr = Array.isArray(v) ? v : (v ? [v] : []);
      arr = arr.map(function (x) { return clean(x, 100); }).filter(function (x) { return q.options.indexOf(x) >= 0; });
      if (!arr.length) return q.required ? { error: '하나 이상 골라 주세요' } : { value: [] };
      return { value: arr };
    }
    var s = clean(Array.isArray(v) ? v[0] : v, q.type === 'long' ? 2000 : 200);
    if (!s) return q.required ? { error: q.type === 'choice' ? '하나를 골라 주세요' : '적어 주세요' } : empty;
    if (q.type === 'choice' && q.options.indexOf(s) < 0) return { error: '목록에서 골라 주세요' };
    if (q.type === 'number') { var n = s.replace(/[,\s명]/g, ''); if (!/^\d{1,6}$/.test(n)) return { error: '숫자로 적어 주세요' }; return { value: String(+n) }; }
    if (q.type === 'date') { var d = normDate(s); if (!d) return { error: '날짜 형식이 맞지 않아요' }; return { value: d }; }
    if (q.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return { error: '이메일 주소를 확인해 주세요' };
    return { value: s };
  }
  function checkContact(req) {
    var errors = {};
    var org = clean(req.org, 80), name = clean(req.name, 30), phone = clean(req.phone, 20);
    if (!org) errors.org = '기관 이름을 적어 주세요';
    if (!name) errors.name = '담당자 성함을 적어 주세요';
    var digits = phone.replace(/\D/g, '');
    if (!phone) errors.phone = '연락처를 적어 주세요';
    else if (!/^[\d\s()+-]+$/.test(phone) || digits.length < 9 || digits.length > 12) errors.phone = '전화번호를 확인해 주세요 (예: 010-1234-5678)';
    return { errors: errors, org: org, name: name, phone: phone };
  }
  function answerText(v) { return Array.isArray(v) ? v.join(', ') : str(v); }

  /* ---------- 요청 처리 ---------- */
  function handle(req, env) {
    req = req || {};
    try {
      var a = str(req.action);
      if (env.ensure) env.ensure();
      if (a === 'ping' || a === 'status') return { ok: true, claimed: !!env.props.get('ADMIN_HASH') };
      if (a === 'claim') return claim(req, env);
      if (a === 'public') return publicData(env);
      if (a === 'content') return contentData(env);
      if (a === 'inquire') return inquire(req, env);
      if (a === 'login') return login(req, env);
      if (!auth(req, env)) return fail('auth', '다시 로그인해 주세요.');
      switch (a) {
        case 'admin': return adminData(env);
        case 'saveEvent': return saveEvent(req, env);
        case 'deleteEvent': return deleteEvent(req, env);
        case 'saveInquiry': return saveInquiry(req, env);
        case 'deleteInquiry': return deleteInquiry(req, env);
        case 'inquiryToEvent': return inquiryToEvent(req, env);
        case 'saveQuestions': return saveQuestions(req, env);
        case 'resetQuestions': return resetQuestions(env);
        case 'saveSettings': return saveSettings(req, env);
        case 'changePassword': return changePassword(req, env);
        case 'saveWork': return saveWork(req, env);
        case 'deleteWork': return deleteWork(req, env);
        case 'orderWorks': return orderWorks(req, env);
        case 'addPhoto': return addPhoto(req, env);
        case 'savePhotos': return savePhotos(req, env);
        case 'logout': env.cache.remove('tok:' + str(req.token)); return { ok: true };
      }
      return fail('action', '알 수 없는 요청입니다.');
    } catch (e) {
      return fail('error', '잠시 후 다시 시도해 주세요.', { detail: str(e && e.message ? e.message : e).slice(0, 300) });
    }
  }

  function publicData(env) {
    var cached = env.cache.get('public');
    if (cached) { try { var c = JSON.parse(cached); if (c.today === env.today()) return c; } catch (e) {} }
    var s = readSettings(env), today = env.today();
    var from = addMonths(monthStart(today), -1), to = addMonths(today, s.maxMonths);
    var events = readEvents(env).filter(function (e) { return e.date >= from && e.date <= to; }).map(publicEvent);
    var out = {
      ok: true, today: today,
      settings: { acceptInquiries: s.acceptInquiries, maxPerDay: s.maxPerDay, openWeekdays: s.openWeekdays, minLeadDays: s.minLeadDays, maxMonths: s.maxMonths, formNotice: s.formNotice, privacyNotice: s.privacyNotice },
      questions: readQuestions(env).filter(function (q) { return q.active; }).map(function (q) { return { id: q.id, label: q.label, type: q.type, options: q.options, required: q.required, help: q.help }; }),
      events: events
    };
    try { env.cache.put('public', JSON.stringify(out), 60); } catch (e) {}
    return out;
  }
  function dirty(env) { try { env.cache.remove('public'); } catch (e) {} }
  function dirtyContent(env) {
    try { env.cache.remove('content'); } catch (e) {}
    try { env.props.set('CONTENT_VER', String((+env.props.get('CONTENT_VER') || 0) + 1)); } catch (e) {}
  }

  /* 홈페이지에 보이는 작품과 사진 (공개) */
  function contentData(env) {
    var cached = env.cache.get('content');
    if (cached) { try { return JSON.parse(cached); } catch (e) {} }
    var works = readWorks(env).filter(function (w) { return w.active; });
    var ids = {}; works.forEach(function (w) { ids[w.id] = true; });
    var out = {
      ok: true, ver: +env.props.get('CONTENT_VER') || 0,
      works: works.map(function (w) { return { id: w.id, title: w.title, badge: w.badge, sub: w.sub, genre: w.genre, time: w.time, line: w.line, story: w.story, points: w.points, theme: w.theme, note: w.note, art: w.art, featured: w.featured }; }),
      photos: readPhotos(env).filter(function (p) { return p.workId === '' || ids[p.workId]; }).map(function (p) { return { id: p.id, workId: p.workId, caption: p.caption, src: p.src, home: p.home }; })
    };
    try { env.cache.put('content', JSON.stringify(out), 300); } catch (e) {}
    return out;
  }

  function inquire(req, env) {
    if (str(req.website)) return { ok: true, id: 'OK' };
    if (+req.elapsed > 0 && +req.elapsed < 2500) return { ok: true, id: 'OK' };
    var s = readSettings(env);
    if (!s.acceptInquiries) return fail('closed', '지금은 온라인 문의를 받지 않고 있어요. 전화로 문의해 주세요.');
    var count = +(env.cache.get('inq-hour') || 0);
    if (count >= 60) return fail('busy', '문의가 몰려 잠시 받을 수 없어요. 잠시 후 다시 시도하거나 전화로 문의해 주세요.');
    var date = normDate(req.date);
    var c = checkContact(req);
    var errors = c.errors;
    if (req.agree !== true) errors.agree = '개인정보 수집·이용에 동의해 주세요';
    var qs = readQuestions(env).filter(function (q) { return q.active; });
    var saved = [];
    qs.forEach(function (q) {
      var r = checkAnswer(q, req.answers ? req.answers[q.id] : '');
      if (r.error) errors[q.id] = r.error;
      else if (r.value !== '' && !(Array.isArray(r.value) && !r.value.length)) saved.push({ id: q.id, label: q.label, value: r.value });
    });
    if (!date) return fail('date', '희망 날짜를 골라 주세요.');
    var info = dayInfo(date, readEvents(env), s, env.today());
    if (info.status !== 'open') return fail('date', dateLabel(date) + '에는 온라인 문의를 받을 수 없어요. 다른 날짜를 골라 주세요.', { status: info.status });
    if (Object.keys(errors).length) return fail('invalid', '입력한 내용을 확인해 주세요.', { errors: errors });

    var dupKey = 'dup:' + c.phone.replace(/\D/g, '') + ':' + date;
    var dup = env.cache.get(dupKey);
    if (dup) return { ok: true, id: dup, duplicate: true };

    var id = 'M' + date.replace(/-/g, '').slice(2) + '-' + env.uuid().slice(0, 4).toUpperCase();
    var summary = saved.map(function (x) { return x.label + ': ' + answerText(x.value); }).join('\n');
    var rec = { id: id, createdAt: env.now(), date: date, org: c.org, name: c.name, phone: c.phone, status: '새 문의', memo: '', summary: summary, eventId: '', answers: saved };
    env.lock(function () { env.store.append('inquiries', fromInquiry(rec)); });
    env.cache.put('inq-hour', String(count + 1), 3600);
    env.cache.put(dupKey, id, 600);
    if (s.notifyEmail && env.mail) {
      try {
        env.mail(s.notifyEmail, '[아동극단 징검다리] 새 공연 문의 · ' + dateLabel(date) + ' · ' + c.org,
          '새 공연 문의가 들어왔어요.\n\n희망 날짜: ' + dateLabel(date) + '\n기관명: ' + c.org + '\n담당자: ' + c.name + '\n연락처: ' + c.phone + '\n\n' + summary +
          '\n\n접수 번호: ' + id + '\n관리자 페이지: ' + (s.siteUrl ? s.siteUrl.replace(/\/$/, '') + '/admin.html' : '홈페이지 주소/admin.html'));
      } catch (e) {}
    }
    return { ok: true, id: id };
  }

  function login(req, env) {
    var fails = +(env.cache.get('login-fail') || 0);
    if (fails >= 8) return fail('locked', '비밀번호를 여러 번 틀려서 15분 동안 잠겼어요. 잠시 후 다시 시도해 주세요.');
    var h = env.props.get('ADMIN_HASH');
    if (!h) return fail('claim', '처음 한 번, 설정 코드로 관리자 비밀번호를 만들어 주세요.');
    if (env.hash(str(req.password)) !== h) {
      env.cache.put('login-fail', String(fails + 1), 900);
      return fail('password', '비밀번호가 맞지 않아요.');
    }
    var token = env.uuid() + env.uuid();
    env.cache.put('tok:' + token, '1', 21600);
    return { ok: true, token: token };
  }
  function claim(req, env) {
    if (env.props.get('ADMIN_HASH')) return fail('claimed', '이미 관리자 비밀번호가 있어요. 로그인해 주세요.');
    var fails = +(env.cache.get('claim-fail') || 0);
    if (fails >= 8) return fail('locked', '설정 코드를 여러 번 틀려서 15분 동안 잠겼어요.');
    if (!env.setupCode || !env.setupCode(str(req.code).trim())) {
      env.cache.put('claim-fail', String(fails + 1), 900);
      return fail('code', '설정 코드가 맞지 않아요.', { errors: { code: '설정 코드를 확인해 주세요' } });
    }
    if (str(req.password).length < 8) return fail('invalid', '비밀번호는 8자 이상으로 해 주세요.', { errors: { password: '8자 이상으로 해 주세요' } });
    env.setPassword(str(req.password));
    var token = env.uuid() + env.uuid();
    env.cache.put('tok:' + token, '1', 21600);
    return { ok: true, token: token };
  }
  function auth(req, env) { var t = str(req.token); return !!t && !!env.cache.get('tok:' + t); }

  function adminData(env) {
    var s = readSettings(env), raw = {};
    env.store.read('settings').forEach(function (r) { raw[str(r.key).trim()] = str(r.value); });
    return {
      ok: true, today: env.today(),
      events: readEvents(env), inquiries: readInquiries(env), questions: readQuestions(env),
      settings: SETTINGS.map(function (d) { return { key: d[0], label: d[1], help: d[3], value: raw.hasOwnProperty(d[0]) ? raw[d[0]] : d[2] }; }),
      parsed: s, works: workTitles(env), workList: readWorks(env), photos: readPhotos(env), arts: ARTS, drive: !!env.drive, types: TYPES, statuses: STATUSES, kinds: KINDS, visibilities: VIS
    };
  }

  function saveEvent(req, env) {
    var e = toEvent(req.event || {});
    if (!e.date) return fail('invalid', '날짜를 확인해 주세요.', { errors: { date: '날짜를 골라 주세요' } });
    if (e.kind === '공연' && !e.title && !e.place) return fail('invalid', '작품이나 기관 이름 중 하나는 적어 주세요.', { errors: { title: '작품을 고르거나 적어 주세요' } });
    var out;
    env.lock(function () {
      var all = env.store.read('events').map(toEvent);
      var found = false;
      for (var i = 0; i < all.length; i++) {
        if (e.id && all[i].id === e.id) { e.createdAt = all[i].createdAt; all[i] = e; found = true; break; }
      }
      if (!found) { e.id = 'E' + e.date.replace(/-/g, '').slice(2) + '-' + env.uuid().slice(0, 4).toUpperCase(); e.createdAt = env.now(); all.push(e); }
      all.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
      env.store.write('events', all.map(fromEvent));
      out = e;
    });
    dirty(env);
    return { ok: true, event: out };
  }
  function deleteEvent(req, env) {
    var id = str(req.id);
    env.lock(function () { env.store.write('events', env.store.read('events').map(toEvent).filter(function (e) { return e.id !== id; }).map(fromEvent)); });
    dirty(env);
    return { ok: true };
  }
  function saveInquiry(req, env) {
    var id = str(req.id), done = null;
    env.lock(function () {
      var all = env.store.read('inquiries').map(toInquiry);
      all.forEach(function (q) {
        if (q.id !== id) return;
        if (req.status !== undefined && STATUSES.indexOf(str(req.status)) >= 0) q.status = str(req.status);
        if (req.memo !== undefined) q.memo = clean(req.memo, 1000);
        done = q;
      });
      if (done) env.store.write('inquiries', all.sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; }).map(fromInquiry));
    });
    return done ? { ok: true, inquiry: done } : fail('missing', '문의를 찾을 수 없어요. 새로고침해 주세요.');
  }
  function deleteInquiry(req, env) {
    var id = str(req.id);
    env.lock(function () { env.store.write('inquiries', env.store.read('inquiries').map(toInquiry).filter(function (q) { return q.id !== id; }).sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; }).map(fromInquiry)); });
    return { ok: true };
  }
  function inquiryToEvent(req, env) {
    var id = str(req.id);
    var q = readInquiries(env).filter(function (x) { return x.id === id; })[0];
    if (!q) return fail('missing', '문의를 찾을 수 없어요.');
    var play = '';
    var titles = workTitles(env);
    q.answers.forEach(function (a) { if (a.id === 'q-play' && (titles.indexOf(str(a.value)) >= 0 || WORKS.indexOf(str(a.value)) >= 0)) play = str(a.value); });
    var time = '';
    q.answers.forEach(function (a) { if (a.id === 'q-time' && str(a.value) !== '상관없음') time = str(a.value); });
    var r = saveEvent({ event: { date: q.date, time: time, kind: '공연', title: play, place: q.org, region: '', visibility: '기관 숨김', memo: '문의 ' + q.id + ' · ' + q.name + ' ' + q.phone } }, env);
    if (!r.ok) return r;
    env.lock(function () {
      var all = env.store.read('inquiries').map(toInquiry);
      all.forEach(function (x) { if (x.id === id) { x.status = '확정'; x.eventId = r.event.id; } });
      env.store.write('inquiries', all.sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; }).map(fromInquiry));
    });
    return { ok: true, event: r.event };
  }
  function saveQuestions(req, env) {
    var list = Array.isArray(req.questions) ? req.questions : [];
    if (list.length > 40) return fail('invalid', '질문은 40개까지 만들 수 있어요.');
    var errors = {}, seen = {}, out = [];
    list.forEach(function (raw, i) {
      var q = { id: str(raw.id).trim(), label: clean(raw.label, 100), type: typeKey(raw.type), options: (Array.isArray(raw.options) ? raw.options : str(raw.options).split('\n')).map(function (x) { return clean(x, 100); }).filter(Boolean), required: !!raw.required && raw.required !== '아니오', help: clean(raw.help, 200), active: raw.active === undefined ? true : (!!raw.active && raw.active !== '아니오') };
      if (!/^q[-\w]{1,40}$/.test(q.id) || seen[q.id]) q.id = 'q-' + env.uuid().slice(0, 6);
      seen[q.id] = true;
      if (!q.label) errors[i] = '질문 내용을 적어 주세요';
      else if ((q.type === 'choice' || q.type === 'multi') && q.options.length < 2) errors[i] = '선택지를 두 개 이상 적어 주세요';
      if (q.type !== 'choice' && q.type !== 'multi') q.options = [];
      out.push(q);
    });
    if (Object.keys(errors).length) return fail('invalid', '고칠 질문이 있어요.', { errors: errors });
    env.lock(function () { env.store.write('questions', out.map(fromQuestion)); });
    dirty(env);
    return { ok: true, questions: readQuestions(env) };
  }
  function resetQuestions(env) {
    env.lock(function () { env.store.write('questions', QUESTIONS.map(fromQuestion)); });
    dirty(env);
    return { ok: true, questions: readQuestions(env) };
  }
  function saveSettings(req, env) {
    var input = req.settings || {}, errors = {};
    var raw = {};
    env.store.read('settings').forEach(function (r) { raw[str(r.key).trim()] = str(r.value); });
    var rows = SETTINGS.map(function (d) {
      var v = input.hasOwnProperty(d[0]) ? input[d[0]] : (raw.hasOwnProperty(d[0]) ? raw[d[0]] : d[2]);
      if (d[0] === 'acceptInquiries') v = yn(v === true || yes(v));
      else if (d[0] === 'openWeekdays') v = (Array.isArray(v) ? v : str(v).split(/[,\s]+/)).filter(function (x) { return WEEK.indexOf(x) >= 0; }).join(',');
      else v = clean(v, d[0] === 'privacyNotice' ? 600 : 300);
      if (d[0] === 'notifyEmail' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors.notifyEmail = '이메일 주소를 확인해 주세요';
      if ((d[0] === 'maxPerDay' || d[0] === 'minLeadDays' || d[0] === 'maxMonths') && !/^\d{1,3}$/.test(v)) errors[d[0]] = '숫자로 적어 주세요';
      return { key: d[0], label: d[1], value: v };
    });
    if (!rows[3].value) errors.openWeekdays = '요일을 하나 이상 골라 주세요';
    if (Object.keys(errors).length) return fail('invalid', '고칠 설정이 있어요.', { errors: errors });
    env.lock(function () { env.store.write('settings', rows); });
    dirty(env);
    return { ok: true, parsed: readSettings(env) };
  }
  function changePassword(req, env) {
    if (env.hash(str(req.current)) !== env.props.get('ADMIN_HASH')) return fail('password', '지금 비밀번호가 맞지 않아요.', { errors: { current: '지금 비밀번호가 맞지 않아요' } });
    var next = str(req.next);
    if (next.length < 8) return fail('invalid', '새 비밀번호는 8자 이상으로 해 주세요.', { errors: { next: '8자 이상으로 해 주세요' } });
    env.setPassword(next);
    return { ok: true };
  }

  /* ---------- 작품·사진 ---------- */
  function saveWork(req, env) {
    var w = toWork(req.work || {}), errors = {};
    if (!w.title) errors.title = '작품 제목을 적어 주세요';
    if (!w.line) errors.line = '한 줄 소개를 적어 주세요';
    if (Object.keys(errors).length) return fail('invalid', '고칠 내용이 있어요.', { errors: errors });
    var list = Array.isArray(req.photos) ? req.photos : null, out, gone = [];
    env.lock(function () {
      var works = env.store.read('works').map(toWork), found = null;
      works.forEach(function (x) { if (w.id && x.id === w.id) found = x; });
      if (!found) {
        if (works.length >= MAX_WORKS) { out = fail('invalid', '작품은 ' + MAX_WORKS + '편까지 만들 수 있어요.'); return; }
        w.id = 'w-' + env.uuid().slice(0, 6).toLowerCase();
        w.order = works.reduce(function (m, x) { return Math.max(m, x.order); }, 0) + 1;
        works.push(w);
      } else {
        w.order = found.order;
        works = works.map(function (x) { return x.id === w.id ? w : x; });
      }
      w.updatedAt = env.now();
      if (w.featured) works.forEach(function (x) { if (x.id !== w.id) x.featured = false; });
      env.store.write('works', works.sort(function (a, b) { return a.order - b.order; }).map(fromWork));
      if (list) gone = applyPhotos(env, w.id, list);
      out = { ok: true, work: w };
    });
    if (!out.ok) return out;
    gone.forEach(function (p) { if (env.drive) try { env.drive.trash(p.src); } catch (e) {} });
    dirtyContent(env);
    out.photos = readPhotos(env).filter(function (p) { return p.workId === out.work.id; });
    return out;
  }
  /* 한 작품(또는 공통 사진 '')의 사진 순서·설명·홈 표시를 목록대로 맞추고, 목록에 없는 사진은 지웁니다 */
  function applyPhotos(env, workId, list) {
    var photos = env.store.read('photos').map(toPhoto), mine = {}, rest = [], kept = [], gone = [];
    photos.forEach(function (p) { if (p.workId === workId) mine[p.id] = p; else rest.push(p); });
    list.forEach(function (x, i) {
      var p = mine[str(x && x.id)];
      if (!p) return;
      p.order = i + 1; p.caption = clean(x.caption, 120); p.home = x.home === true || yes(x.home);
      kept.push(p); delete mine[p.id];
    });
    Object.keys(mine).forEach(function (k) { gone.push(mine[k]); });
    env.store.write('photos', rest.concat(kept).map(fromPhoto));
    return gone;
  }
  function savePhotos(req, env) {
    var workId = str(req.workId), list = Array.isArray(req.photos) ? req.photos : [], gone = [];
    if (workId && !readWorks(env).some(function (w) { return w.id === workId; })) return fail('missing', '작품을 찾을 수 없어요. 새로고침해 주세요.');
    env.lock(function () { gone = applyPhotos(env, workId, list); });
    gone.forEach(function (p) { if (env.drive) try { env.drive.trash(p.src); } catch (e) {} });
    dirtyContent(env);
    return { ok: true, photos: readPhotos(env).filter(function (p) { return p.workId === workId; }) };
  }
  function deleteWork(req, env) {
    var id = str(req.id), gone = [];
    env.lock(function () {
      env.store.write('works', env.store.read('works').map(toWork).filter(function (w) { return w.id !== id; }).map(fromWork));
      var photos = env.store.read('photos').map(toPhoto);
      gone = photos.filter(function (p) { return p.workId === id; });
      env.store.write('photos', photos.filter(function (p) { return p.workId !== id; }).map(fromPhoto));
    });
    gone.forEach(function (p) { if (env.drive) try { env.drive.trash(p.src); } catch (e) {} });
    dirtyContent(env);
    return { ok: true };
  }
  function orderWorks(req, env) {
    var ids = Array.isArray(req.ids) ? req.ids.map(str) : [];
    env.lock(function () {
      var works = env.store.read('works').map(toWork);
      works.forEach(function (w) { var i = ids.indexOf(w.id); w.order = i >= 0 ? i + 1 : ids.length + w.order; });
      works.sort(function (a, b) { return a.order - b.order; }).forEach(function (w, i) { w.order = i + 1; });
      env.store.write('works', works.map(fromWork));
    });
    dirtyContent(env);
    return { ok: true, works: readWorks(env) };
  }
  function addPhoto(req, env) {
    if (!env.drive) return fail('drive', '사진 저장소가 아직 연결되지 않았어요. 제작자에게 알려 주세요.');
    var workId = str(req.workId), data = str(req.data).replace(/^data:[^,]*,/, ''), mime = str(req.mime) || 'image/jpeg';
    if (!/^image\/(jpeg|png|webp)$/.test(mime)) return fail('invalid', 'JPG·PNG 사진만 올릴 수 있어요.');
    if (!data || data.length > 14000000 || !/^[A-Za-z0-9+/=\s]+$/.test(data.slice(0, 2000))) return fail('invalid', '사진을 읽지 못했어요. 다른 사진으로 해 보세요.');
    var work = workId ? readWorks(env).filter(function (w) { return w.id === workId; })[0] : { title: '징검다리' };
    if (!work) return fail('missing', '작품을 찾을 수 없어요. 새로고침해 주세요.');
    var mine = readPhotos(env).filter(function (p) { return p.workId === workId; });
    if (mine.length >= MAX_PHOTOS) return fail('invalid', '작품마다 사진은 ' + MAX_PHOTOS + '장까지 올릴 수 있어요.');
    var src = env.drive.save(data, mime, (workId || 'common') + '-' + env.now().replace(/\D/g, '') + (mime === 'image/png' ? '.png' : '.jpg'));
    var p = { id: 'P' + env.uuid().slice(0, 8).toUpperCase(), workId: workId, order: mine.reduce(function (m, x) { return Math.max(m, x.order); }, 0) + 1, caption: clean(req.caption, 120) || work.title + ' 공연 사진', src: src, home: false, createdAt: env.now() };
    env.lock(function () { env.store.append('photos', fromPhoto(p)); });
    dirtyContent(env);
    return { ok: true, photo: p };
  }

  /* 처음 한 번: 시트와 기본값 만들기 (이미 있는 내용은 지우지 않습니다) */
  function setup(env, opts) {
    opts = opts || {};
    if (!env.store.read('questions').length) env.store.write('questions', QUESTIONS.map(fromQuestion));
    var have = {};
    env.store.read('settings').forEach(function (r) { have[str(r.key).trim()] = str(r.value); });
    env.store.write('settings', SETTINGS.map(function (d) {
      var v = have.hasOwnProperty(d[0]) ? have[d[0]] : d[2];
      if (d[0] === 'notifyEmail' && !v && opts.ownerEmail) v = opts.ownerEmail;
      return { key: d[0], label: d[1], value: v };
    }));
    env.store.read('events');
    env.store.read('inquiries');
    if (!env.store.read('works').length && opts.seed && Array.isArray(opts.seed.works)) {
      env.store.write('works', opts.seed.works.map(function (w, i) { var x = toWork(w); x.order = i + 1; return fromWork(x); }));
      env.store.write('photos', (opts.seed.photos || []).map(function (p, i) { var x = toPhoto(p); x.order = x.order || i + 1; return fromPhoto(x); }));
    } else { env.store.read('works'); env.store.read('photos'); }
    dirty(env);
  }

  return {
    WEEK: WEEK, TYPES: TYPES, STATUSES: STATUSES, KINDS: KINDS, VIS: VIS, WORKS: WORKS, ARTS: ARTS, SETTINGS: SETTINGS, QUESTIONS: QUESTIONS, SCHEMA: SCHEMA, STATUS_TEXT: STATUS_TEXT,
    photoUrl: photoUrl, workName: workName, toWork: toWork, fromWork: fromWork, fromPhoto: fromPhoto,
    handle: handle, setup: setup, dayInfo: dayInfo, checkAnswer: checkAnswer, checkContact: checkContact, parseSettings: parseSettings,
    normDate: normDate, addDays: addDays, addMonths: addMonths, weekday: weekday, monthStart: monthStart, dateLabel: dateLabel, answerText: answerText, typeLabel: typeLabel,
    fromEvent: fromEvent, fromInquiry: fromInquiry, fromQuestion: fromQuestion
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = JG;
