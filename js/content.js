/* 작품·사진: 관리자 페이지에서 고친 내용을 홈페이지에 바로 보여 주기
   - 페이지는 만들 때의 내용(검색에 잡히는 글)을 먼저 보여 주고, 관리자가 그 뒤에 고친 것이 있으면 바꿔 그립니다.
   - 새로 만든 작품은 works/view.html?w=번호 로 보여 줍니다. (다시 만들면 정식 페이지가 생깁니다) */
(function () {
  'use strict';
  var api = window.JGApi, J = window.JG;
  if (!api || !J || api.mode === 'off') return;
  var me = document.currentScript;
  var root = me && me.src ? me.src.replace(/js\/content\.js(\?.*)?$/, '') : '';
  var body = document.body;
  var pageVer = +(body.getAttribute('data-content-ver') || 0);
  var statics = (body.getAttribute('data-static-works') || '').split(',').filter(Boolean);
  var details = {}; // 상세 안내가 있는 작품 → 대표 그림 이름 (만드는 쪽 build.py 의 key_art)
  (body.getAttribute('data-detail-works') || '').split(',').forEach(function (x) { var kv = x.split(':'); if (kv[0]) details[kv[0]] = kv[1]; });
  var main = document.querySelector('main[data-work]');
  var isView = !!main && !main.getAttribute('data-work');
  var viewId = isView ? new URLSearchParams(location.search).get('w') || '' : '';

  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (attrs[k] == null || attrs[k] === false) continue;
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'class') e.className = attrs[k];
      else e.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function link(w) {
    if (details[w.id]) return root + 'works/' + w.id + '-detail.html';
    return statics.indexOf(w.id) >= 0 ? root + 'works/' + w.id + '.html' : root + 'works/view.html?w=' + encodeURIComponent(w.id);
  }
  function src(p, size) { return J.photoUrl(p.src, size, root); }
  function image(p, sizes, eager) {
    var s = src(p, 800), l = src(p, 1600);
    var i = h('img', { src: s, alt: p.caption || '', sizes: sizes, width: '1600', height: '1067', loading: eager ? null : 'lazy', decoding: 'async' });
    if (l && l !== s) {
      i.setAttribute('srcset', s + ' 800w, ' + l + ' 1600w');
      i.addEventListener('error', function () { if (i.getAttribute('srcset')) { i.removeAttribute('srcset'); i.src = s; } });
    }
    return i;
  }
  function photoBtn(p, sizes) {
    return h('button', { class: 'reveal', type: 'button', 'data-full': src(p, 1600), 'data-caption': p.caption || '', 'aria-label': (p.caption || '공연 사진') + ' 크게 보기' }, [image(p, sizes)]);
  }
  function stones() { return h('div', { class: 'art-stones', 'aria-hidden': 'true' }, [h('span'), h('span'), h('span')]); }
  function meta(w) { return w.genre.slice(0, 2).join(' · ') + (w.time ? ' · ' + w.time : ''); }
  function byWork(photos) { var m = {}; photos.forEach(function (p) { (m[p.workId] = m[p.workId] || []).push(p); }); return m; }

  /* 첫 화면: 작품 목록 (만드는 쪽 build.py 의 work_card 와 같은 모양: 대표 그림을 포스터처럼) */
  function card(w, ph) {
    var badge = w.badge ? h('span', { class: 'badge', text: w.badge }) : null;
    var pic;
    if (details[w.id]) {
      var n = root + 'img/' + details[w.id];
      pic = h('img', { src: n + '-800.webp', srcset: n + '-800.webp 800w, ' + n + '-1600.webp 1600w', sizes: '(max-width: 600px) 46vw, (max-width: 1000px) 30vw, 260px', alt: '「' + w.title + '」 ' + (/-poster/.test(details[w.id]) ? '포스터' : '대표 그림'), width: '800', height: /-poster/.test(details[w.id]) ? '1131' : '1192', loading: 'lazy', decoding: 'async' });
    } else if (ph.length) pic = image(ph[0], '(max-width: 600px) 46vw, 260px');
    else pic = h('span', { class: 'hm-play-art ' + (w.art || 'art-sun'), 'aria-hidden': 'true', text: w.title });
    var title = h('b', { class: 'hm-play-title' }, [w.title, w.sub ? h('small', { text: w.sub }) : null]);
    return h('a', { class: 'hm-play reveal', href: link(w) }, [h('span', { class: 'hm-play-ph' }, [pic]),
      h('span', { class: 'hm-play-body' }, [badge, h('span', { class: 'meta', text: meta(w) }), title, h('span', { class: 'hm-play-line', text: w.line }), h('span', { class: 'go' }, ['상세 안내 ', h('span', { class: 'arr', text: '→' })])])]);
  }
  function polaroid(p) {
    return h('button', { class: 'reveal', type: 'button', 'data-full': src(p, 1600), 'data-caption': p.caption || '', 'aria-label': (p.caption || '공연 사진') + ' 크게 보기' },
      [h('span', { class: 'dx-pol' }, [image(p, '(max-width: 760px) 45vw, 30vw'), h('span', { text: p.caption || '' })])]);
  }
  function drawHome(d) {
    var by = byWork(d.photos);
    var grid = document.querySelector('[data-works]');
    if (grid && d.works.length) {
      grid.textContent = '';
      d.works.forEach(function (w) { grid.appendChild(card(w, by[w.id] || [])); });
    }
    var gal = document.querySelector('[data-gallery]');
    if (gal) {
      var groups = d.works.map(function (w) { return by[w.id] || []; }).concat([by[''] || []]).map(function (g) { return g.filter(function (p) { return p.home; }); });
      var list = [];
      for (var i = 0; groups.some(function (g) { return i < g.length; }); i++) groups.forEach(function (g) { if (i < g.length) list.push(g[i]); });
      if (list.length) { gal.textContent = ''; gal.setAttribute('data-n', list.length); list.forEach(function (p) { gal.appendChild(polaroid(p)); }); }
    }
  }
  function drawLists(d) {
    var foot = document.querySelector('[data-foot-works]');
    if (foot) {
      var last = foot.lastElementChild;
      foot.textContent = '';
      d.works.slice(0, 6).forEach(function (w) { foot.appendChild(h('li', null, [h('a', { href: link(w), text: w.title })])); });
      if (last && /faq/.test(last.innerHTML)) foot.appendChild(last);
    }
  }

  /* 작품 페이지 */
  function drawWork(d, id) {
    var w = d.works.filter(function (x) { return x.id === id; })[0];
    var hero = main.querySelector('.page-hero');
    if (!w) {
      if (hero && !main.querySelector('.work-missing')) hero.parentNode.insertBefore(h('p', { class: 'notice work-missing', style: 'margin:18px 0 0', text: isView ? '찾는 작품이 없어요. 아래 다른 작품을 둘러보세요.' : '이 작품은 지금 홈페이지 작품 목록에 없어요. 다른 작품도 둘러보세요.' }), hero);
      drawOthers(d, id);
      return;
    }
    var ph = byWork(d.photos)[w.id] || [];
    var full = w.title + (w.sub ? ' (' + w.sub + ')' : '');
    if (viewId) document.title = full + ' | 아동극단 징검다리';
    var wrap = hero.querySelector('.ph-wrap');
    wrap.textContent = '';
    if (ph.length && !w.art) wrap.appendChild(image(ph[0], '(max-width: 860px) 100vw, 55vw', true));
    else wrap.appendChild(h('div', { class: 'art-cover ' + (w.art || 'art-sun'), 'aria-hidden': 'true' }, [h('div', null, [h('div', { class: 'art-title', text: w.title }), stones()])]));
    var copy = hero.querySelector('.copy');
    copy.querySelector('.kicker').textContent = w.sub || w.badge || w.genre[0] || '공연 작품';
    var h1 = copy.querySelector('h1'), inner = h1.querySelector('.ln > span') || h1;
    inner.textContent = w.title;
    var stamp = copy.querySelector('.stamp');
    if (w.badge) { if (!stamp) { stamp = h('span', { class: 'stamp' }); h1.after(stamp); } stamp.textContent = w.badge; } else if (stamp) stamp.remove();
    copy.querySelector('.lead').textContent = w.line;
    var chips = copy.querySelector('.chips');
    chips.textContent = '';
    w.genre.concat(w.time ? [w.time] : []).forEach(function (m) { chips.appendChild(h('li', { text: m })); });

    var story = main.querySelector('.story-text');
    if (story) {
      story.querySelectorAll('p').forEach(function (p) { p.remove(); });
      w.story.forEach(function (t) { story.appendChild(h('p', { text: t })); });
    }
    var pts = main.querySelector('.points');
    if (pts) {
      var f = pts.querySelector('.formula');
      f.textContent = '';
      w.points.forEach(function (t, i) {
        if (i) f.appendChild(h('span', { class: 'plus', 'aria-hidden': 'true', text: '+' }));
        f.appendChild(h('div', { class: 'chip' }, [h('i', { class: 'ph-fill ph-star' }), h('span', { text: t })]));
      });
      if (w.theme) { f.appendChild(h('span', { class: 'plus', 'aria-hidden': 'true', text: '=' })); f.appendChild(h('div', { class: 'result' }, ['주제: ', h('span', { class: 'ul', text: w.theme })])); }
      var note = pts.querySelector('.theme-line');
      if (w.note) { if (!note) { note = h('p', { class: 'theme-line', style: 'margin-top:6px' }); pts.appendChild(note); } note.textContent = w.note; } else if (note) note.remove();
    }
    var sec = main.querySelector('[data-photos]');
    if (sec) {
      var row = sec.querySelector('.photo-row');
      row.textContent = '';
      var show = ph.length > 1 || (w.art && ph.length);
      if (show) ph.forEach(function (p) { row.appendChild(photoBtn(p, '(max-width: 600px) 100vw, 33vw')); });
      sec.hidden = !show;
    }
    main.querySelectorAll('.cta-band h2').forEach(function (t) { if (/공연을 원하시나요/.test(t.textContent)) t.textContent = '「' + w.title + '」 공연을 원하시나요?'; });
    drawOthers(d, w.id);
  }
  function drawOthers(d, id) {
    var ul = main.querySelector('[data-others]');
    if (!ul) return;
    ul.textContent = '';
    d.works.forEach(function (o) { if (o.id !== id) ul.appendChild(h('li', null, [h('a', { href: link(o), text: o.title })])); });
  }

  api.call('content').then(function (d) {
    if (!d || !d.ok || !Array.isArray(d.works)) return;
    if (!isView && +d.ver === pageVer) return; // 만든 뒤로 바뀐 것이 없으면 그대로
    if (main) drawWork(d, isView ? viewId : main.getAttribute('data-work'));
    else drawHome(d);
    drawLists(d);
  });
})();
