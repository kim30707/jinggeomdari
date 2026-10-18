/* 첫 화면 슬라이드: 진행 막대가 차면 같은 색 선이 와이프 경계가 되어 다음 사진을 밀어 넣습니다. */
(function () {
  'use strict';
  var hero = document.querySelector('[data-slider]');
  if (!hero) return;
  var copies = [].slice.call(hero.querySelectorAll('.slide-copy'));
  var photos = [].slice.call(hero.querySelectorAll('.stage-photo'));
  var tabs = [].slice.call(hero.querySelectorAll('.tab'));
  var frame = hero.querySelector('.stage-frame');
  var line = hero.querySelector('.wipe-line');
  var live = hero.querySelector('.slides-copy');
  var pauseBtn = hero.querySelector('[data-pause]');
  var n = copies.length, cur = 0, busy = false, progress = null;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var css = getComputedStyle(document.documentElement);
  function ms(name, def) { var v = parseFloat(css.getPropertyValue(name)); return isNaN(v) ? def : v; }
  var SLIDE = ms('--slide', 5000), WIPE = ms('--d-wipe', 375), EXIT = ms('--d-exit', 150), LINE = ms('--d-line', 750), BEAT = ms('--beat', 125);
  var E1 = 'cubic-bezier(.2,.7,.2,1)', E2 = 'cubic-bezier(.45,0,.15,1)';
  var why = { user: false, hidden: false, away: false, hover: false, focus: false };
  var canAnimate = typeof Element.prototype.animate === 'function';

  function loadPhoto(i) {
    var img = photos[i] && photos[i].querySelector('img');
    if (img && img.dataset.src) { if (img.dataset.srcset) img.srcset = img.dataset.srcset; img.src = img.dataset.src; delete img.dataset.src; }
  }
  if (document.readyState === 'complete') photos.forEach(function (_, i) { loadPhoto(i); });
  else window.addEventListener('load', function () { photos.forEach(function (_, i) { loadPhoto(i); }); });

  function states(i) {
    copies.forEach(function (c, k) { c.classList.toggle('is-active', k === i); c.inert = k !== i; c.setAttribute('aria-hidden', k === i ? 'false' : 'true'); });
    photos.forEach(function (p, k) { p.classList.toggle('is-active', k === i); });
    tabs.forEach(function (t, k) { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; t.classList.remove('full'); });
  }
  function kenBurns(i) {
    if (reduce.matches) return;
    var img = photos[i].querySelector('img');
    img.classList.remove('kb'); void img.offsetWidth; img.classList.add('kb');
  }

  function runProgress() {
    if (progress) progress.cancel();
    if (reduce.matches || !canAnimate) return;
    var bar = tabs[cur].querySelector('i');
    progress = bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: SLIDE, easing: 'linear', fill: 'forwards' });
    progress.onfinish = function () { go((cur + 1) % n, false); };
    sync();
  }
  function paused() { return why.user || why.hidden || why.away || why.hover || why.focus; }
  function sync() { if (!progress) return; if (paused()) progress.pause(); else if (progress.playState === 'paused') progress.play(); }

  function go(i, manual) {
    if (i === cur || busy) return;
    loadPhoto(i);
    live.setAttribute('aria-live', manual ? 'polite' : 'off');
    var from = cur; cur = i;
    if (progress) { progress.cancel(); progress = null; }
    if (reduce.matches || !canAnimate) { states(i); tabs[i].classList.add('full'); return; }
    busy = true;
    tabs[from].classList.remove('full');
    // 1) 옛 글자 퇴장
    var old = copies[from];
    old.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-8px)' }], { duration: EXIT, easing: E1, fill: 'forwards' });
    // 2) 와이프: 선이 경계가 되어 다음 사진을 밀어 넣음
    var next = photos[i];
    next.classList.add('is-entering');
    kenBurns(i);
    var w = frame.getBoundingClientRect().width;
    next.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: WIPE, easing: E2 });
    var wl = line.animate([{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(' + (w - 2) + 'px)', opacity: 1, offset: .96 }, { transform: 'translateX(' + (w - 2) + 'px)', opacity: 0 }], { duration: WIPE, easing: E2 });
    wl.onfinish = function () {
      next.classList.remove('is-entering');
      states(i);
      old.getAnimations().forEach(function (a) { a.cancel(); });
      photos[from].querySelector('img').classList.remove('kb');
      // 3) 새 글자: 머리말 → 제목 줄 → 리드 → 버튼
      setTimeout(function () {
        var c = copies[i], k = 0;
        var parts = [c.querySelector('.kicker')].concat([].slice.call(c.querySelectorAll('.ln > span')), [c.querySelector('.lead'), c.querySelector('.slide-cta')]);
        parts.forEach(function (el) {
          if (!el) return;
          var isLine = el.parentNode.classList.contains('ln');
          el.animate(isLine ? [{ transform: 'translateY(105%)' }, { transform: 'none' }] : [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }],
            { duration: LINE, easing: E1, delay: k++ * BEAT, fill: 'backwards' });
        });
        busy = false;
        runProgress();
      }, 60);
    };
  }

  tabs.forEach(function (t, k) { t.addEventListener('click', function () { go(k, true); }); });
  hero.querySelector('[data-prev]').addEventListener('click', function () { go((cur - 1 + n) % n, true); });
  hero.querySelector('[data-next]').addEventListener('click', function () { go((cur + 1) % n, true); });
  hero.addEventListener('keydown', function (e) {
    if (e.target.matches('input, textarea')) return;
    if (e.key === 'ArrowRight') { go((cur + 1) % n, true); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { go((cur - 1 + n) % n, true); e.preventDefault(); }
  });
  var sx = null;
  frame.addEventListener('pointerdown', function (e) { sx = e.clientX; });
  frame.addEventListener('pointerup', function (e) { if (sx === null) return; var dx = e.clientX - sx; sx = null; if (Math.abs(dx) >= 40) go((cur + (dx < 0 ? 1 : n - 1)) % n, true); });
  pauseBtn.addEventListener('click', function () {
    why.user = !why.user;
    pauseBtn.setAttribute('aria-pressed', String(why.user));
    pauseBtn.setAttribute('aria-label', why.user ? '자동 넘김 다시 시작' : '자동 넘김 멈춤');
    pauseBtn.querySelector('i').className = why.user ? 'ph ph-play' : 'ph ph-pause';
    sync();
  });
  document.addEventListener('visibilitychange', function () { why.hidden = document.hidden; sync(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { why.away = es[0].intersectionRatio < 0.35; sync(); }, { threshold: [0, 0.35, 1] }).observe(hero);
  hero.querySelector('.stage').addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { why.hover = true; sync(); } });
  hero.querySelector('.stage').addEventListener('pointerleave', function () { why.hover = false; sync(); });
  hero.addEventListener('focusin', function () { why.focus = true; sync(); });
  hero.addEventListener('focusout', function () { setTimeout(function () { why.focus = hero.contains(document.activeElement); sync(); }, 0); });
  var onReduce = function () { if (reduce.matches) { if (progress) progress.cancel(); progress = null; photos.forEach(function (p) { p.querySelector('img').classList.remove('kb'); }); pauseBtn.hidden = true; } else { pauseBtn.hidden = false; runProgress(); } };
  if (reduce.addEventListener) reduce.addEventListener('change', onReduce);

  states(0);
  kenBurns(0);
  if (reduce.matches) { pauseBtn.hidden = true; tabs[0].classList.add('full'); } else runProgress();
})();
