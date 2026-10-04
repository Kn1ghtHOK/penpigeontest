// Review shell: a gallery, a viewer that shows one design in an iframe with a
// rating dock underneath, and a summary. Answers live in localStorage and are
// pushed to /api/feedback (worker.js) a moment after every change. If there is
// no Worker behind this copy of the site, "Copy my feedback" is the fallback.
(function () {
  'use strict';

  var D = window.PP_DESIGNS;
  var main = document.getElementById('main');
  var KEY = 'pp-review-v1';
  var DEVICE_KEY = 'pp-review-device';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = matchMedia('(max-width: 699px)');

  var byId = function (id) { return D.filter(function (d) { return d.id === id; })[0]; };
  var idx = function (id) { return D.map(function (d) { return d.id; }).indexOf(id); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  // ---------- state ----------

  function fresh() {
    var a = new Uint8Array(12);
    (crypto.getRandomValues ? crypto : window.msCrypto).getRandomValues(a);
    var id = Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    return { id: id, name: '', ratings: {}, favourite: null, overall: '' };
  }
  function read() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s && typeof s.id === 'string' && s.ratings) return Object.assign(fresh(), s);
    } catch (e) { /* private mode: fall through to a fresh, in-memory state */ }
    return fresh();
  }
  var S = read();
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  function rating(id) { return S.ratings[id] || (S.ratings[id] = { score: null, comment: '' }); }
  function scoreOf(id) { return S.ratings[id] && S.ratings[id].score; }
  function ratedCount() { return D.filter(function (d) { return scoreOf(d.id); }).length; }
  function hasContent() {
    return !!(S.name || S.overall || S.favourite || D.some(function (d) {
      var r = S.ratings[d.id]; return r && (r.score || r.comment);
    }));
  }

  // ---------- sync ----------

  var status = 'idle';   // idle | saving | sent | local | error
  var timer = 0;
  var STATUS_TEXT = {
    saving: 'Saving…',
    sent: 'Saved. Thanks.',
    local: 'Saved on this device only.',
    error: 'Couldn’t reach the server. Saved on this device.'
  };

  function setStatus(s) {
    status = s;
    var dock = document.querySelector('.dstat');
    if (dock) dock.textContent = STATUS_TEXT[s] || (viewerId && !scoreOf(viewerId) ? '1 = not for me, 5 = love it' : '');
    var sync = document.querySelector('.sync');
    if (sync) renderSync(sync);
  }
  function touch() {
    persist();
    clearTimeout(timer);
    if (!hasContent()) return;
    setStatus('saving');
    timer = setTimeout(push, 700);
  }
  function push() {
    if (!hasContent()) return Promise.resolve();
    return fetch('/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(S)
    }).then(function (r) {
      setStatus(r.ok ? 'sent' : (r.status === 404 || r.status === 405 ? 'local' : 'error'));
    }, function () { setStatus('error'); });
  }
  addEventListener('online', function () { if (status === 'error') push(); });
  addEventListener('pagehide', function () {
    if ((status === 'saving' || status === 'error') && navigator.sendBeacon) {
      try { navigator.sendBeacon('/api/feedback', new Blob([JSON.stringify(S)], { type: 'application/json' })); } catch (e) { /* ignore */ }
    }
  });

  // ---------- router ----------

  var viewerId = null;
  var ro = null;

  function route(first) {
    if (ro) { ro.disconnect(); ro = null; }
    viewerId = null;
    var parts = location.hash.replace(/^#\/?/, '').split('/');
    if (parts[0] === 'd' && byId(parts[1])) viewer(parts[1]);
    else if (parts[0] === 'done') done();
    else home();
    window.scrollTo(0, 0);
    if (first !== true) main.focus({ preventScroll: true });
  }
  addEventListener('hashchange', function () { route(); });

  function animateIn(selector, opts) {
    if (!window.gsap || reduced) return;
    gsap.from(selector, Object.assign({ opacity: 0, y: 22, duration: 0.6, ease: 'power3.out', clearProps: 'all' }, opts));
  }

  // ---------- home ----------

  function home() {
    document.body.classList.remove('in-viewer');
    document.title = 'PenPigeon: twelve homepage looks';
    var n = ratedCount();
    var next = D.filter(function (d) { return !scoreOf(d.id); })[0] || D[0];

    main.innerHTML =
      '<div class="home">' +
        '<header class="home-head">' +
          '<p class="eyebrow">PenPigeon · homepage redesign</p>' +
          '<h1>Twelve looks for one homepage.</h1>' +
          '<p class="lede">PenPigeon turns a photo into a postcard. A pen plotter writes the note on the back, and we stamp and mail it. These are twelve possible looks for its homepage, each one a full page with scroll animation.</p>' +
          '<p class="lede">Open each one and scroll all the way down. Give it a rating from 1 to 5, and add a note if something stood out. Try a few on your phone too. About ten minutes.</p>' +
        '</header>' +
        '<form class="start" id="start">' +
          '<label>Your name (optional)<input id="name" type="text" autocomplete="given-name" maxlength="60" placeholder="So I know who said what"></label>' +
          '<a class="btn" href="#/d/' + next.id + '">' + (n ? 'Continue' : 'Start with the first one') + ' →</a>' +
          (n ? '<a class="btn ghost" href="#/done">See my answers</a>' : '') +
          '<p class="fine">Your ratings, notes and the name you enter are sent to me. Nothing else is collected.</p>' +
          '<div class="progress"><i style="--p:' + n / D.length + '"><b></b></i><span>' + n + ' of ' + D.length + ' rated</span></div>' +
        '</form>' +
        '<ul class="grid" id="grid"></ul>' +
      '</div>';

    var name = document.getElementById('name');
    name.value = S.name;
    name.addEventListener('input', function () { S.name = name.value.trim().slice(0, 60); touch(); });
    document.getElementById('start').addEventListener('submit', function (e) { e.preventDefault(); });

    var grid = document.getElementById('grid');
    D.forEach(function (d) {
      var sc = scoreOf(d.id);
      var li = document.createElement('li');
      li.className = 'card';
      li.innerHTML =
        '<a href="#/d/' + d.id + '">' +
          '<img src="review-assets/thumbs/' + d.id + '.jpg" alt="" width="900" height="563" loading="lazy">' +
          '<div class="meta"><span class="num">' + d.n + '</span><h2>' + esc(d.name) + '</h2>' +
          '<p class="feel">' + esc(d.feel) + '</p><p class="line">' + esc(d.line) + '</p></div>' +
        '</a>' +
        ((sc || S.favourite === d.id)
          ? '<div class="badges">' + (sc ? '<span class="badge">' + sc + '/5</span>' : '') +
            (S.favourite === d.id ? '<span class="badge is-fav">Favourite</span>' : '') + '</div>'
          : '');
      grid.appendChild(li);
    });

    animateIn('.home-head > *', { stagger: 0.08 });
    animateIn('.start', { delay: 0.25 });
    animateIn('.card', { stagger: 0.04, delay: 0.3, y: 30 });
  }

  // ---------- viewer ----------

  var device = 'desktop';
  try { device = localStorage.getItem(DEVICE_KEY) === 'phone' ? 'phone' : 'desktop'; } catch (e) { /* ignore */ }

  function viewer(id) {
    var d = byId(id), i = idx(id), prev = D[i - 1], next = D[i + 1];
    var r = S.ratings[id] || { score: null, comment: '' };
    viewerId = id;
    document.body.classList.add('in-viewer');
    document.title = d.n + ' ' + d.name + ' · PenPigeon review';

    var radios = '';
    for (var k = 1; k <= 5; k++) {
      radios += '<label><input class="sr" type="radio" name="score" value="' + k + '"' + (r.score === k ? ' checked' : '') +
        ' aria-label="' + k + ' out of 5"><span aria-hidden="true">' + k + '</span></label>';
    }
    var nextBtn = next
      ? '<a class="nbtn primary" href="#/d/' + next.id + '" aria-label="Next: ' + esc(next.name) + '">Next →</a>'
      : '<a class="nbtn primary" href="#/done" aria-label="Finish and see my answers">Finish →</a>';
    var prevBtn = '<a class="nbtn" href="' + (prev ? '#/d/' + prev.id : '#/') + '" aria-label="' +
      (prev ? 'Previous: ' + esc(prev.name) : 'Back to all designs') + '"' + '>←</a>';

    main.innerHTML =
      '<div class="viewer">' +
        '<header class="vbar">' +
          '<a class="back" href="#/">← All</a>' +
          '<div class="vtitle"><span class="vnum">' + d.n + ' / ' + D.length + '</span><strong>' + esc(d.name) + '</strong><span class="vfeel">' + esc(d.feel) + '</span></div>' +
          '<div class="vtools">' +
            '<div class="seg" role="group" aria-label="Preview size">' +
              '<button type="button" data-dev="desktop" aria-pressed="' + (device === 'desktop') + '">Desktop</button>' +
              '<button type="button" data-dev="phone" aria-pressed="' + (device === 'phone') + '">Phone</button>' +
            '</div>' +
            '<a class="open" href="' + d.id + '/index.html" target="_blank" rel="noopener">Full page ↗</a>' +
          '</div>' +
          '<div class="vnav">' + prevBtn + nextBtn.replace('Next →', '→').replace('Finish →', '✓') + '</div>' +
        '</header>' +
        '<div class="stage" data-device="' + device + '">' +
          '<div class="pframe"><div class="pin"><iframe title="' + esc(d.name) + ' homepage design" src="' + d.id + '/index.html"></iframe>' +
          '<div class="loading" role="status">Loading</div></div></div>' +
        '</div>' +
        '<footer class="dock">' +
          '<div class="dnav">' + prevBtn + nextBtn + '</div>' +
          '<fieldset class="rate"><legend>Your rating</legend><div class="rate-btns">' + radios + '</div></fieldset>' +
          '<button class="fav" type="button" aria-pressed="' + (S.favourite === id) + '"><span aria-hidden="true">♥</span><span class="fav-t">Favourite</span></button>' +
          '<div class="note"><label class="sr" for="cmt">Note on ' + esc(d.name) + '</label><textarea id="cmt" rows="1" maxlength="1200" placeholder="What works? What doesn’t? (optional)"></textarea></div>' +
          '<a class="dopen" href="' + d.id + '/index.html" target="_blank" rel="noopener">Open ↗</a>' +
          '<div class="dstat" role="status" aria-live="polite"></div>' +
        '</footer>' +
      '</div>';

    var stage = main.querySelector('.stage');
    var pframe = main.querySelector('.pframe');
    var pin = main.querySelector('.pin');
    var frame = main.querySelector('iframe');
    var loading = main.querySelector('.loading');
    var cmt = document.getElementById('cmt');
    cmt.value = r.comment || '';

    function fit() {
      var dev = small.matches ? 'fill' : device;
      stage.dataset.device = dev;
      if (dev === 'phone') {
        var s = Math.min(1, (stage.clientHeight - 56) / 844, (stage.clientWidth - 56) / 390);
        pframe.style.width = Math.round(390 * s) + 'px';
        pframe.style.height = Math.round(844 * s) + 'px';
        pin.style.transform = 'scale(' + s + ')';
      } else {
        pframe.style.width = pframe.style.height = pin.style.transform = '';
      }
    }
    fit();
    if (window.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(stage); }
    frame.addEventListener('load', function () { loading.classList.add('gone'); });
    setTimeout(function () { loading.classList.add('gone'); }, 9000);

    main.querySelectorAll('.seg button').forEach(function (b) {
      b.addEventListener('click', function () {
        device = b.dataset.dev;
        try { localStorage.setItem(DEVICE_KEY, device); } catch (e) { /* ignore */ }
        main.querySelectorAll('.seg button').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        fit();
      });
    });

    main.querySelectorAll('input[name="score"]').forEach(function (inp) {
      inp.addEventListener('change', function () { rating(id).score = +inp.value; touch(); });
    });
    var fav = main.querySelector('.fav');
    fav.addEventListener('click', function () {
      S.favourite = S.favourite === id ? null : id;
      fav.setAttribute('aria-pressed', String(S.favourite === id));
      touch();
    });
    function grow() { cmt.style.height = 'auto'; cmt.style.height = Math.min(cmt.scrollHeight, 120) + 'px'; }
    cmt.addEventListener('input', function () { rating(id).comment = cmt.value; grow(); touch(); });
    grow();
    setStatus(status);

    animateIn('.dock', { y: 40, duration: 0.5 });
    animateIn('.vbar', { y: -20, duration: 0.45 });
  }

  addEventListener('keydown', function (e) {
    if (!viewerId || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(input|textarea|select)$/i.test(e.target.tagName)) return;
    var i = idx(viewerId);
    if (e.key === 'ArrowRight') location.hash = D[i + 1] ? '#/d/' + D[i + 1].id : '#/done';
    else if (e.key === 'ArrowLeft') location.hash = D[i - 1] ? '#/d/' + D[i - 1].id : '#/';
    else if (e.key === 'Escape') location.hash = '#/';
  });

  // ---------- done ----------

  function feedbackText() {
    var lines = ['PenPigeon design feedback' + (S.name ? ' from ' + S.name : ''), ''];
    var fav = S.favourite && byId(S.favourite);
    lines.push('Favourite: ' + (fav ? fav.n + ' ' + fav.name : 'none picked'), '');
    D.forEach(function (d) {
      var r = S.ratings[d.id];
      if (!r || (!r.score && !r.comment)) { lines.push(d.n + ' ' + d.name + ': not rated'); return; }
      lines.push(d.n + ' ' + d.name + ': ' + (r.score ? r.score + '/5' : 'no score') + (r.comment ? ' · ' + r.comment.replace(/\s+/g, ' ') : ''));
    });
    if (S.overall) lines.push('', 'Overall: ' + S.overall);
    return lines.join('\n');
  }

  function renderSync(el) {
    var m = {
      sent: ['ok', 'Your answers are saved and sent. You can close this tab or keep editing.'],
      saving: ['', 'Sending…'],
      local: ['', 'This copy of the site can’t receive answers. Use “Copy my feedback” and send it back.'],
      error: ['', 'Couldn’t reach the server. Try again in a moment, or use “Copy my feedback” and send it back.'],
      idle: ['', hasContent() ? 'Sending…' : 'Nothing rated yet. Go back and open a few.']
    }[status] || ['', ''];
    el.className = 'sync' + (m[0] ? ' ' + m[0] : '');
    el.textContent = m[1];
  }

  function done() {
    document.body.classList.remove('in-viewer');
    document.title = 'Your answers · PenPigeon review';
    var rows = D.map(function (d) {
      var r = S.ratings[d.id] || {};
      return '<li><img src="review-assets/thumbs/' + d.id + '.jpg" alt="" loading="lazy">' +
        '<div><h2>' + d.n + ' ' + esc(d.name) + '</h2>' +
        '<span class="sc' + (r.score ? '' : ' none') + '">' + (r.score ? r.score + '/5' : 'Not rated') + '</span>' +
        (S.favourite === d.id ? ' <span class="badge is-fav" style="position:static">Favourite</span>' : '') +
        (r.comment ? '<p>' + esc(r.comment) + '</p>' : '') + '</div>' +
        '<a class="edit" href="#/d/' + d.id + '">Edit</a></li>';
    }).join('');

    main.innerHTML =
      '<div class="done">' +
        '<p class="eyebrow">PenPigeon · homepage redesign</p>' +
        '<h1>Thanks. Here’s what you said.</h1>' +
        '<p class="sync" role="status"></p>' +
        '<ol class="sum" style="list-style:none">' + rows + '</ol>' +
        '<label class="overall">Anything else? Which one would you pick, and why?<textarea id="overall" maxlength="2000"></textarea></label>' +
        '<form class="start" style="margin-top:20px" onsubmit="return false"><label>Your name (optional)<input id="dname" type="text" maxlength="60"></label></form>' +
        '<div class="actions"><button class="btn" id="copy" type="button">Copy my feedback</button><a class="btn ghost" href="#/">Back to all twelve</a></div>' +
      '</div>';

    var overall = document.getElementById('overall');
    overall.value = S.overall;
    overall.addEventListener('input', function () { S.overall = overall.value; touch(); });
    var dname = document.getElementById('dname');
    dname.value = S.name;
    dname.addEventListener('input', function () { S.name = dname.value.trim().slice(0, 60); touch(); });

    document.getElementById('copy').addEventListener('click', function () {
      var btn = this, text = feedbackText();
      function ok() { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy my feedback'; }, 2000); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, legacy);
      else legacy();
      function legacy() {
        var t = document.createElement('textarea');
        t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); ok(); } catch (e) { btn.textContent = 'Copy failed'; }
        t.remove();
      }
    });

    renderSync(document.querySelector('.sync'));
    if (hasContent()) { setStatus('saving'); push(); }
    animateIn('.done > *', { stagger: 0.06 });
  }

  route(true);
})();
