/* 문의 질문 그리기·읽기 (홈페이지 문의 창과 관리자 미리보기가 함께 씁니다) */
(function () {
  'use strict';
  function el(tag, attrs, kids) {
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
  function field(q, value, prefix) {
    var id = (prefix || 'f') + '-' + q.id;
    var req = q.required ? el('span', { class: 'req', 'aria-hidden': 'true', text: '*' }) : null;
    var help = q.help ? el('p', { class: 'help', id: id + '-help', text: q.help }) : null;
    var err = el('p', { class: 'err', id: id + '-err', hidden: true });
    var described = [q.help ? id + '-help' : '', id + '-err'].filter(Boolean).join(' ');
    if (q.type === 'choice' || q.type === 'multi') {
      var multi = q.type === 'multi';
      var vals = multi ? (Array.isArray(value) ? value : []) : [value];
      var opts = el('div', { class: 'opts' }, q.options.map(function (o, i) {
        return el('label', { class: 'opt' }, [
          el('input', { type: multi ? 'checkbox' : 'radio', name: id, value: o, id: id + '-' + i, checked: vals.indexOf(o) >= 0, 'aria-describedby': described }),
          el('span', { text: o })
        ]);
      }));
      return el('fieldset', { class: 'fld', 'data-q': q.id }, [el('legend', null, [q.label, req]), help, opts, err]);
    }
    var attrs = { id: id, name: id, class: 'inp', 'aria-describedby': described, required: q.required ? true : null };
    var input;
    if (q.type === 'long') { input = el('textarea', attrs); input.value = value || ''; input.maxLength = 2000; }
    else {
      attrs.type = q.type === 'number' ? 'text' : q.type === 'date' ? 'date' : q.type === 'email' ? 'email' : 'text';
      if (q.type === 'number') { attrs.inputmode = 'numeric'; attrs.placeholder = '예: 40'; }
      if (q.type === 'email') attrs.autocomplete = 'email';
      input = el('input', attrs); input.value = value || ''; input.maxLength = 200;
    }
    return el('div', { class: 'fld', 'data-q': q.id }, [el('label', { for: id }, [q.label, req]), help, input, err]);
  }
  function render(box, questions, values, prefix) {
    box.textContent = '';
    questions.forEach(function (q) { box.appendChild(field(q, values ? values[q.id] : '', prefix)); });
  }
  function read(box, questions, prefix) {
    var out = {};
    questions.forEach(function (q) {
      var id = (prefix || 'f') + '-' + q.id;
      if (q.type === 'choice') { var c = box.querySelector('input[name="' + id + '"]:checked'); out[q.id] = c ? c.value : ''; }
      else if (q.type === 'multi') out[q.id] = [].slice.call(box.querySelectorAll('input[name="' + id + '"]:checked')).map(function (x) { return x.value; });
      else { var i = box.querySelector('#' + CSS.escape(id)); out[q.id] = i ? i.value : ''; }
    });
    return out;
  }
  function errors(box, errs) {
    var first = null;
    box.querySelectorAll('.fld').forEach(function (f) {
      var key = f.dataset.q || f.dataset.key, msg = errs && errs[key];
      var p = f.querySelector('.err');
      f.classList.toggle('bad', !!msg);
      if (p) { p.hidden = !msg; p.textContent = msg || ''; }
      var inp = f.querySelector('input, textarea, select');
      if (inp) inp.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (msg && !first) first = f;
    });
    if (first) { var i = first.querySelector('input, textarea, select'); if (i) i.focus({ preventScroll: true }); first.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    return !!first;
  }
  window.JGForm = { el: el, field: field, render: render, read: read, errors: errors };
})();
