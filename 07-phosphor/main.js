/* PenPigeon / 07 Phosphor. GSAP drives everything that moves.
   Signature: the G-code stream. One scrubbed timeline types the session on the left,
   draws the real note on the plotter bed (DrawSVG) and scrolls the G1 readout, all
   from the same schedule built in plotcore.js. Without JS or with reduced motion the
   page is the finished state: every line typed, the note drawn, the readout parked. */
(function () {
  'use strict';
  var html = document.documentElement;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- always-on UI ---------- */
  var bar = $('#bar'), menu = $('.menu'), crtBtn = $('.crt-t');
  if (crtBtn) {
    crtBtn.setAttribute('aria-pressed', html.getAttribute('data-crt') === 'off' ? 'false' : 'true');
    crtBtn.addEventListener('click', function () {
      var off = html.getAttribute('data-crt') !== 'off';
      if (off) html.setAttribute('data-crt', 'off'); else html.removeAttribute('data-crt');
      crtBtn.setAttribute('aria-pressed', off ? 'false' : 'true');
      store.set('pp-crt', off ? 'off' : 'on');
    });
  }
  if (menu) {
    var closeMenu = function (focus) {
      bar.classList.remove('is-open'); menu.setAttribute('aria-expanded', 'false'); if (focus) menu.focus();
    };
    menu.addEventListener('click', function () {
      var open = bar.classList.toggle('is-open'); menu.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    bar.addEventListener('keydown', function (e) { if (e.key === 'Escape' && bar.classList.contains('is-open')) closeMenu(true); });
    $$('#links a').forEach(function (a) { a.addEventListener('click', function () { closeMenu(false); }); });
  }

  /* FAQ: arrow keys move between commands, Enter/Space (native) open them */
  var sums = $$('#faq-list summary');
  sums.forEach(function (s, i) {
    s.addEventListener('keydown', function (e) {
      var to = null;
      if (e.key === 'ArrowDown') to = sums[(i + 1) % sums.length];
      else if (e.key === 'ArrowUp') to = sums[(i - 1 + sums.length) % sums.length];
      else if (e.key === 'Home') to = sums[0];
      else if (e.key === 'End') to = sums[sums.length - 1];
      if (to) { e.preventDefault(); to.focus(); }
    });
  });

  /* ---------- the plot model and its readouts ---------- */
  var strokes = $$('#note path');
  var model = window.PlotCore ? PlotCore.build(strokes.map(function (p) { return p.getAttribute('d'); })) : null;
  var prog = model ? model.header.concat(model.lines.map(function (l) { return l.text; })) : [];
  var gcLines = $$('#gc .gl');
  var el = { pen: $('#pen'), x: $('#s-x'), y: $('#s-y'), p: $('#s-pen'), n: $('#s-n') };
  var strokesLine = $('#t-strokes');
  if (model && strokesLine) strokesLine.textContent = model.count + ' strokes. pen down.';
  var last = {};
  function put(node, key, val) { if (last[key] !== val) { last[key] = val; node.textContent = val; } }
  function pad(n) { return n.toFixed(2).padStart(6, '0'); }
  function setState(t) {
    if (!model) return;
    var s, count, NV = gcLines.length;
    if (t <= 0) { s = { bed: [20, 420], x: 0, y: 0, down: false, stroke: 0 }; count = model.header.length; }
    else { s = model.stateAt(t); count = model.header.length + s.count; }
    var running = t > 0 && t < model.total;
    el.pen.style.opacity = running ? '1' : '0';
    el.pen.setAttribute('transform', 'translate(' + s.bed[0].toFixed(1) + ' ' + s.bed[1].toFixed(1) + ')');
    put(el.x, 'x', pad(s.x)); put(el.y, 'y', pad(s.y));
    put(el.p, 'p', s.down ? 'down' : 'up');
    put(el.n, 'n', s.stroke + '/' + model.count);
    for (var i = 0; i < NV; i++) {
      var idx = count - NV + i;
      put(gcLines[i], 'g' + i, idx >= 0 && idx < prog.length ? String(idx).padStart(4, '0') + '  ' + prog[idx] : '');
      gcLines[i].classList.toggle('is-now', running && i === NV - 1);
    }
  }
  function finalState() { if (model) { last = {}; setState(model.total); } }

  /* ---------- GSAP ---------- */
  if (!window.gsap || !window.ScrollTrigger) return;
  var plugins = [window.ScrollTrigger, window.DrawSVGPlugin, window.ScrambleTextPlugin, window.SplitText].filter(Boolean);
  gsap.registerPlugin.apply(gsap, plugins);
  var hasScramble = !!window.ScrambleTextPlugin, hasDraw = !!window.DrawSVGPlugin, hasSplit = !!window.SplitText;
  var navH = function () { return bar ? bar.offsetHeight : 60; };

  /* --- typing helpers: real text stays in the DOM, a clip-path wipe steps through it --- */
  function chWidth(host) {
    var s = document.createElement('span');
    s.textContent = '0'.repeat(40);
    s.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;left:0;top:0';
    host.appendChild(s); var w = s.getBoundingClientRect().width / 40; s.remove(); return w;
  }
  var wrapped = [];
  function wrapText(p, ch) {
    var full = p.dataset.full || (p.dataset.full = p.textContent.replace(/\s+/g, ' ').trim());
    var cs = getComputedStyle(p);
    var avail = p.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var cols = Math.max(12, Math.floor(avail / ch));
    var words = full.split(' '), lines = [], cur = '';
    words.forEach(function (w) {
      if (cur && (cur + ' ' + w).length > cols) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
    });
    lines.push(cur);
    p.innerHTML = lines.map(function (l, i) { return '<span class="ln">' + l + (i < lines.length - 1 ? ' ' : '') + '</span>'; }).join('');
    wrapped.push(p);
  }
  function unwrapAll() { wrapped.forEach(function (p) { p.textContent = p.dataset.full; }); wrapped.length = 0; }

  function typeEl(tl, node, at, dur, reg) {
    var parts = $$('.ln', node); if (!parts.length) parts = [node];
    var total = parts.reduce(function (a, p) { return a + p.textContent.length; }, 0), t = at;
    parts.forEach(function (p) {
      var n = Math.max(1, p.textContent.length), d = dur * n / total;
      tl.fromTo(p, { '--r': 100 }, { '--r': 0, duration: d, ease: 'steps(' + n + ')', immediateRender: true }, t);
      if (reg) reg.push({ el: p, n: n, t0: t, t1: t + d, x: p.offsetLeft, y: p.offsetTop, cw: p.offsetWidth / n, h: p.offsetHeight });
      t += d;
    });
    return t;
  }

  /* --- the plot, shared by the pinned (wide) and sticky (narrow) versions --- */
  function addPlot(tl, p0, p1, addrAt, pmAt) {
    if (!model) return;
    var T = model.total, k = (p1 - p0) / T, clock = { t: 0 };
    gsap.set(strokes, { autoAlpha: 0 });
    tl.fromTo(clock, { t: 0 }, { t: T, duration: p1 - p0, ease: 'none', onUpdate: function () { setState(clock.t); } }, p0);
    if (hasDraw) {
      strokes.forEach(function (p, i) {
        var s = model.strokeStart[i], a = p0 + s.t0 * k, d = Math.max(0.0005, (s.t1 - s.t0) * k);
        tl.set(p, { autoAlpha: 1 }, a);
        tl.fromTo(p, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: d, ease: 'none', immediateRender: true }, a);
      });
    } else {
      strokes.forEach(function (p, i) { tl.fromTo(p, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, p0 + model.strokeStart[i].t0 * k); });
    }
    gsap.set('.addr line', { scaleX: 0, transformOrigin: '0% 50%' });
    tl.to('.addr line', { scaleX: 1, duration: 1.6, stagger: 1.2, ease: 'steps(12)' }, addrAt);
    tl.fromTo('#postmark', { autoAlpha: 0, scale: 1.7, svgOrigin: '0 0' }, { autoAlpha: 1, scale: 1, duration: 2.2, ease: 'power4.in', immediateRender: true }, pmAt);
  }

  function buildScene(mode) {
    var track = $('#track'), body = $('#term-body'), cur = $('#term-cur');
    var ch = chWidth(body);
    $$('[data-wrap]', body).forEach(function (p) { wrapText(p, ch); });
    setState(0);

    if (mode === 'slim') {
      gsap.set(cur, { display: 'none' });
      $$('.tl', body).forEach(function (n) {
        if (n.closest('.wide-only')) return;
        var t = gsap.timeline({ scrollTrigger: { trigger: n, start: 'top 92%', once: true } });
        typeEl(t, n, 0, Math.min(1.5, 0.3 + n.textContent.length * 0.012));
      });
      var plotEl = $('#plot');
      var tp = gsap.timeline({
        scrollTrigger: {
          trigger: plotEl, scrub: 0.6, invalidateOnRefresh: true,
          start: function () { return 'top top+=' + navH(); },
          end: function () { return '+=' + (parseFloat(getComputedStyle(plotEl.parentNode, '::after').height) || window.innerHeight); }
        }
      });
      addPlot(tp, 4, 84, 86, 91);
      tp.set({}, {}, 100);
      return;
    }

    /* wide: one scrubbed timeline over the whole pinned track (duration = 100 "scroll percent") */
    var reg = [];
    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: track, scrub: 0.6, invalidateOnRefresh: true,
        start: function () { return 'top top+=' + navH(); }, end: 'bottom bottom'
      }
    });
    var steps = $$('.step', body), L = steps.map(function (s) { return $$('.tl', s); });
    typeEl(tl, $('.tl.cmd', body), 0, 4, reg);
    typeEl(tl, L[0][0], 4.5, 1.5, reg); typeEl(tl, L[0][1], 6, 5, reg);
    typeEl(tl, L[1][0], 12, 1.5, reg); typeEl(tl, L[1][1], 13.5, 5, reg);
    typeEl(tl, L[2][0], 20, 1.5, reg); typeEl(tl, L[2][1], 21.5, 8, reg);
    typeEl(tl, L[3][0], 32, 4.5, reg); typeEl(tl, L[3][1], 37, 2.5, reg);
    addPlot(tl, 40, 86, 89.5, 95.5);
    typeEl(tl, L[3][2], 86, 2, reg);
    typeEl(tl, L[4][0], 89, 1.5, reg); typeEl(tl, L[4][1], 90.5, 4.5, reg); typeEl(tl, L[4][2], 95.5, 2.5, reg);
    tl.set({}, {}, 100);

    /* the shared cursor rides the leading edge of whichever line is being typed */
    var curH = cur.offsetHeight || 19;
    function place() {
      var time = tl.time(), e = reg[0], i;
      for (i = 0; i < reg.length; i++) { if (reg[i].t0 <= time) e = reg[i]; else break; }
      var p = time < reg[0].t0 ? 0 : Math.min(1, Math.max(0, (time - e.t0) / (e.t1 - e.t0)));
      var k = Math.ceil(p * e.n - 1e-6);
      gsap.set(cur, { x: e.x + k * e.cw + 2, y: e.y + (e.h - curH) / 2, opacity: 1 });
    }
    tl.eventCallback('onUpdate', place);
    place();
  }

  /* --- boot --- */
  var introDone = false;
  function runBoot(done) {
    var boot = $('#boot');
    if (!html.classList.contains('boot')) { done(); return; }
    var lines = $$('.bl', boot);
    gsap.set(lines, { '--r': 100 });
    var finished = false;
    var tl = gsap.timeline({ onComplete: finish });
    lines.forEach(function (l, i) {
      var n = l.textContent.length;
      tl.to(l, { '--r': 0, duration: Math.max(0.14, n * 0.011), ease: 'steps(' + n + ')' }, i * 0.2);
    });
    tl.to(boot, { scaleY: 0.006, duration: 0.2, ease: 'power3.in', transformOrigin: '50% 50%' }, '+=0.15')
      .to(boot, { autoAlpha: 0, duration: 0.1 });
    function finish() {
      if (finished) return; finished = true;
      html.classList.remove('boot'); gsap.set(boot, { clearProps: 'all' });
      window.removeEventListener('keydown', skip); window.removeEventListener('pointerdown', skip);
      done();
    }
    function skip() { tl.timeScale(12); }
    window.addEventListener('keydown', skip); window.addEventListener('pointerdown', skip);
  }

  function heroIntro() {
    var cmdLine = $('#hero-cmd'), ls = $$('#h1 .l'), lede = $('.hero .lede'), cta = $('.hero .cta');
    var facts = $$('.facts li'), note = $('.hero .note'), art = $('.hero__art');
    var ledeText = lede.textContent;
    cmdLine.classList.add('fx');
    gsap.set(cmdLine, { '--r': 100 });
    gsap.set(ls, { '--r': 100 });
    gsap.set([lede, cta, facts, note, art], { autoAlpha: 0 });
    var tl = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onComplete: function () { introDone = true; } });
    var n0 = cmdLine.textContent.length;
    tl.to(cmdLine, { '--r': 0, duration: 0.7, ease: 'steps(' + n0 + ')' }, 0)
      .to(art, { autoAlpha: 1, duration: 0.8, ease: 'steps(7)' }, 0.3)
      .to(ls[0], { '--r': 0, duration: 0.45, ease: 'steps(' + ls[0].textContent.length + ')' }, 0.65)
      .to(ls[1], { '--r': 0, duration: 0.55, ease: 'steps(' + ls[1].textContent.length + ')' }, 1.05);
    if (hasScramble) {
      tl.set(lede, { autoAlpha: 1 }, 1.5)
        .to(lede, { duration: 1, scrambleText: { text: ledeText, chars: '01+-*#/', speed: 0.9, revealDelay: 0.1 } }, 1.5);
    } else tl.to(lede, { autoAlpha: 1, duration: 0.5, ease: 'steps(5)' }, 1.5);
    tl.to(cta, { autoAlpha: 1, duration: 0.4, ease: 'steps(4)' }, 2.1)
      .to(facts, { autoAlpha: 1, duration: 0.2, ease: 'steps(2)', stagger: 0.16 }, 2.4)
      .to(note, { autoAlpha: 1, duration: 0.3, ease: 'steps(3)' }, 3);
    return tl;
  }

  function init() {
    var mm = gsap.matchMedia();
    mm.add({
      full: '(prefers-reduced-motion: no-preference) and (min-width: 900px)',
      slim: '(prefers-reduced-motion: no-preference) and (max-width: 899px)'
    }, function (ctx) {
      var wide = !!ctx.conditions.full;

      /* hero: boot, then the console types itself in */
      var introTl = null, blink = null;
      if (!introDone) {
        introTl = heroIntro();
        runBoot(function () { introTl.play(); });
      }
      var eye = $('#eye');
      if (eye) {
        blink = gsap.timeline({ repeat: -1, repeatDelay: 3.6, delay: 5 })
          .call(function () { eye.textContent = '--'; }).call(function () { eye.textContent = '  '; }, null, 0.16);
      }

      /* the plot scene: rebuilt when the width changes so the typed lines re-wrap */
      var sceneCtx = gsap.context(function () { buildScene(wide ? 'full' : 'slim'); });
      var lastW = window.innerWidth, timer = 0;
      function onResize() {
        clearTimeout(timer);
        timer = setTimeout(function () {
          if (window.innerWidth === lastW) return;
          lastW = window.innerWidth;
          sceneCtx.revert(); unwrapAll();
          sceneCtx = gsap.context(function () { buildScene(wide ? 'full' : 'slim'); });
          ScrollTrigger.refresh();
        }, 320);
      }
      window.addEventListener('resize', onResize);

      /* reveal language: prompts type, headings decode, blocks warm up */
      var ctxA = gsap.context(function () {
        $$('.prompt[data-rv]').forEach(function (p) {
          p.classList.add('fx');
          var n = p.textContent.length;
          gsap.fromTo(p, { '--r': 100 }, { '--r': 0, duration: Math.min(1.1, 0.25 + n * 0.014), ease: 'steps(' + n + ')', scrollTrigger: { trigger: p, start: 'top 92%', once: true } });
        });
        if (hasScramble) {
          $$('main h2').forEach(function (h) {
            var txt = h.textContent; h.setAttribute('aria-label', txt);
            ScrollTrigger.create({ trigger: h, start: 'top 90%', once: true, onEnter: function () {
              gsap.to(h, { duration: 0.9, scrambleText: { text: txt, chars: '01#/*+', speed: 0.9, revealDelay: 0.05 } });
            } });
          });
        }
        var rv = $$('[data-rv]:not(.prompt)');
        gsap.set(rv, { autoAlpha: 0 });
        var show = function (els) {
          var fresh = els.filter(function (e) { if (e._rv) return false; e._rv = 1; return true; });
          if (fresh.length) gsap.to(fresh, { autoAlpha: 1, duration: 0.55, ease: 'steps(5)', stagger: 0.08 });
        };
        ScrollTrigger.batch(rv, { start: 'top 92%', once: true, onEnter: show, onLeave: show });

        /* handwriting: boxes light up letter by letter, then the alphabet fills in */
        if (hasSplit) {
          var chars = [];
          ['#pg1', '#pg2'].forEach(function (s) {
            var sp = SplitText.create(s, { type: 'words,chars', wordsClass: 'w', charsClass: 'c' });
            chars = chars.concat(sp.chars);
          });
          var cells = $$('#alpha li');
          gsap.set(chars.concat(cells), { '--f': 0 });
          gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.trace__demo', start: 'top 78%', end: 'bottom 52%', scrub: 0.5 } })
            .to(chars, { '--f': 1, duration: 0.3, stagger: { amount: 1 } }, 0)
            .to(cells, { '--f': 1, duration: 0.3, stagger: { amount: 0.9 } }, 0.8);
        }

        /* pricing prints line by line */
        $$('[data-print]').forEach(function (r, i) {
          var lines = Math.max(6, Math.round(r.offsetHeight / 27));
          gsap.fromTo(r, { '--pr': 100 }, { '--pr': 0, duration: 1.7, delay: i * 0.35, ease: 'steps(' + lines + ')', scrollTrigger: { trigger: r, start: 'top 88%', once: true } });
        });

        /* closing pigeon flies in as the section arrives */
        gsap.fromTo('.fly', { xPercent: -130 }, { xPercent: 0, ease: 'none', scrollTrigger: { trigger: '.close', start: 'top bottom', end: 'center 65%', scrub: true } });

        /* FAQ answers decode when opened */
        if (hasScramble) {
          setTimeout(function () {
            $$('#faq-list details').forEach(function (d) {
              d.addEventListener('toggle', function () {
                if (!d.open) return;
                var p = $('p', d), t = p.textContent;
                gsap.to(p, { duration: 0.5, scrambleText: { text: t, chars: '01', speed: 1 } });
              });
            });
          }, 600);
        }
      });

      return function () {
        window.removeEventListener('resize', onResize); clearTimeout(timer);
        sceneCtx.revert(); ctxA.revert(); unwrapAll(); finalState();
        if (blink) blink.kill();
        if (introTl && !introDone) { introTl.progress(1); }
      };
    });

    ScrollTrigger.refresh();
  }

  var started = false;
  function go() { if (started) return; started = true; init(); }
  var fontsOK = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsOK, new Promise(function (r) { setTimeout(r, 1500); })]).then(go);
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
