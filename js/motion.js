/* 공통 움직임: 스크롤 등장 · 카드 순차 · 줄 마스크 · 밑줄 · 선 그리기 · 메뉴 · 사진 크게 보기 · SNS 주소 */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var saveData = navigator.connection && navigator.connection.saveData;
  setTimeout(function () { root.classList.remove('first'); }, 2200);

  var SEL = '.reveal, .ul, .lines, .draw, .draw-y, .beat';
  function prepare() {
    document.querySelectorAll('[data-stagger]').forEach(function (box) {
      Array.prototype.forEach.call(box.children, function (el, i) {
        if (el.classList.contains('reveal')) el.style.setProperty('--delay', Math.min(i, 4) * 90 + 'ms');
      });
    });
    document.querySelectorAll('.beat, .draw, .draw-y').forEach(function (box) {
      Array.prototype.forEach.call(box.children, function (el, i) { el.style.setProperty('--i', i); });
    });
    document.querySelectorAll('.lines .ln').forEach(function (el, i, all) {
      var siblings = el.parentNode.querySelectorAll('.ln');
      el.style.setProperty('--i', Array.prototype.indexOf.call(siblings, el));
    });
  }
  function start() {
    prepare();
    if (reduce.matches || saveData || !('IntersectionObserver' in window)) return;
    root.classList.add('mo');
    var vh = window.innerHeight;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.remove('mo-pre');
        e.target.classList.add('mo-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll(SEL).forEach(function (el) {
      if (el.closest('.page-hero') || el.closest('.hero')) return;
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) return; // 이미 화면 안: 연출 생략
      el.classList.add('mo-pre');
      io.observe(el);
    });
    var stop = function () { if (!reduce.matches) return; root.classList.remove('mo'); document.querySelectorAll('.mo-pre').forEach(function (el) { el.classList.remove('mo-pre'); }); };
    if (reduce.addEventListener) reduce.addEventListener('change', stop);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  // 모바일 메뉴
  var toggle = document.querySelector('.nav-toggle'), links = document.querySelector('.nav-links');
  if (toggle && links) {
    var set = function (open) { links.classList.toggle('open', open); toggle.setAttribute('aria-expanded', String(open)); toggle.querySelector('i').className = open ? 'ph ph-x' : 'ph ph-list'; };
    toggle.addEventListener('click', function () { set(!links.classList.contains('open')); });
    links.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  }

  // 사진 크게 보기
  var box = document.querySelector('.lightbox');
  if (box && typeof box.showModal === 'function') {
    var img = box.querySelector('img'), cap = box.querySelector('p');
    document.querySelectorAll('[data-full]').forEach(function (b) {
      b.addEventListener('click', function () { img.src = b.dataset.full; img.alt = b.dataset.caption || ''; cap.textContent = b.dataset.caption || ''; box.showModal(); });
    });
    box.querySelector('.close').addEventListener('click', function () { box.close(); });
    box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
  }

  // SNS 주소 채우기 (js/site-config.js)
  var cfg = window.SITE_CONFIG || {};
  document.querySelectorAll('[data-sns]').forEach(function (el) {
    var url = String(cfg[el.dataset.sns] || '').trim();
    if (!/^https?:\/\//.test(url)) return;
    var a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener';
    a.className = el.className.replace('soon', '').trim();
    a.innerHTML = el.innerHTML.replace('개설 준비 중', '바로가기');
    el.replaceWith(a);
  });
  document.querySelectorAll('[data-sns-link]').forEach(function (a) {
    var url = String(cfg[a.dataset.snsLink] || '').trim();
    if (/^https?:\/\//.test(url)) { a.href = url; a.hidden = false; }
  });
})();
