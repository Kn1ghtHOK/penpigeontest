/* PenPigeon / Bauhaus poster: choreography.
   Desktop (motion allowed): hero + how-it-works is ONE pinned stage; the same 16 pieces assemble into the
   pigeon, carry the card, then rebuild into four step compositions. A big half-circle sweeps like a clock hand.
   Mobile: each poster gets its own small stage built by the same piece factory, scrubbed on its own scroll.
   Reduced motion / no JS: everything is static and readable, the note already written. */
(function () {
  'use strict';
  if (!window.gsap || !window.ScrollTrigger) { document.documentElement.classList.remove('hold'); return; }
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);

  var PS = window.PPScenes, SC = PS.SCENES, html = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var construct = $('.construct');
  var noteSrc = $$('#noteSrc path').map(function (p) { return { d: p.getAttribute('d'), w: +p.getAttribute('stroke-width') }; });
  var firstBuild = true, introDone = false, lastStageRef = {};

  /* ---------------------------------------------------------------- helpers */
  function recolor(S, map) {
    var o = { pieces: {}, sweep: Object.assign({}, S.sweep), note: S.note, bg: S.bg };
    PS.PIECES.forEach(function (id) { var p = Object.assign({}, S.pieces[id]); if (map[p.fill]) p.fill = map[p.fill]; o.pieces[id] = p; });
    if (map[o.sweep.fill]) o.sweep.fill = map[o.sweep.fill];
    return o;
  }
  var C = PS.COL;

  function sizeSvg(svg, w, h) {
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('width', w); svg.setAttribute('height', h);
  }

  /* draw the real note stroke by stroke (scrubbed), with a pen nib that follows the line */
  function addNoteDraw(tl, stage, at, dur) {
    var N = stage.note, paths = N.paths, lens = paths.map(function (p) { return p.getTotalLength(); });
    var total = lens.reduce(function (a, b) { return a + b; }, 0), cum = 0, ends = [];
    gsap.set(paths, { opacity: 0, drawSVG: '0%' });
    gsap.set(N.nib, { opacity: 0 });
    paths.forEach(function (p, i) {
      var d = lens[i] / total * dur;
      tl.to(p, { opacity: 1, duration: 0.01 }, at + cum);
      tl.fromTo(p, { drawSVG: '0%' }, { drawSVG: '100%', duration: d, ease: 'none', immediateRender: false }, at + cum);
      cum += d; ends.push(cum);
    });
    var proxy = { p: 0 };
    tl.to(N.nib, { opacity: 1, duration: 0.01 }, at);
    tl.to(proxy, {
      p: 1, duration: dur, ease: 'none',
      onUpdate: function () {
        var t = proxy.p * dur, i = 0;
        while (i < ends.length - 1 && t > ends[i]) i++;
        var start = i ? ends[i - 1] : 0, f = Math.max(0, Math.min(1, (t - start) / (ends[i] - start)));
        var pt = paths[i].getPointAtLength(f * lens[i]);
        gsap.set(N.nib, { x: pt.x - 281.6, y: pt.y - 87.6 });
      }
    }, at);
    tl.to(N.nib, { opacity: 0, duration: 0.01 }, at + dur);
  }

  function finishNote(stage) {
    gsap.set(stage.note.paths, { opacity: 1, drawSVG: '100%' });
    gsap.set(stage.note.nib, { opacity: 0 });
  }

  /* ---------------------------------------------------------------- hero intro (time based, runs once) */
  function introHero(stage, W, H) {
    var tl = gsap.timeline({ delay: 0.15 });
    PS.PIECES.concat(['sweep']).forEach(function (id, i) {
      var a = i * 2.4 + 1;
      var far = Math.max(W, H) * 1.1;
      tl.from(stage.fly[id], {
        x: Math.cos(a) * far, y: Math.sin(a) * far, rotation: (i % 2 ? 1 : -1) * (360 + i * 40),
        duration: 1.5, ease: 'power3.out'
      }, i * 0.05);
    });
    return tl;
  }

  function introCopy() {
    var h1 = $('#h1');
    if (introDone) return;
    introDone = true;
    SplitText.create(h1, {
      type: 'lines', mask: 'lines', autoSplit: true,
      onSplit: function (self) {
        (self.masks || []).forEach(function (m) { m.style.paddingBottom = '.16em'; m.style.marginBottom = '-.16em'; });
        return gsap.from(self.lines, { yPercent: 115, duration: 1, stagger: 0.12, ease: 'power4.out', delay: 0.25 });
      }
    });
    gsap.from(['.sub', '.cta .btn', '.fine'], { autoAlpha: 0, y: 26, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.75 });
    gsap.fromTo('#band', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power3.inOut', delay: 0.5, clearProps: 'clipPath' });
  }

  /* ---------------------------------------------------------------- marquee (the facts band) */
  function marquee(reduced) {
    var track = $('.band__track'), pause = $('.band__pause');
    if (reduced) return;
    var tw = gsap.to(track, { xPercent: -25, duration: 16, ease: 'none', repeat: -1 });
    var paused = false, reset;
    html.classList.add('marq');
    pause.onclick = function () {
      paused = !paused;
      pause.setAttribute('aria-pressed', paused ? 'true' : 'false');
      pause.setAttribute('aria-label', paused ? 'Play facts ticker' : 'Pause facts ticker');
      if (paused) tw.pause(); else tw.play();
    };
    ScrollTrigger.create({
      trigger: construct, start: 'top top', end: 'max',
      onUpdate: function (self) {
        var v = Math.min(Math.abs(self.getVelocity()) / 220, 8);
        if (paused) return;
        gsap.to(tw, { timeScale: 1 + v, duration: 0.25, overwrite: true });
        clearTimeout(reset);
        reset = setTimeout(function () { gsap.to(tw, { timeScale: 1, duration: 0.8 }); }, 120);
      }
    });
  }

  /* ---------------------------------------------------------------- pinned master stage (desktop) */
  function buildPinned() {
    html.classList.add('is-pin');
    var W = construct.clientWidth, H = construct.clientHeight;
    var svg = $('#stage'); sizeSvg(svg, W, H);
    var stage = PS.makeStage(svg, { note: noteSrc });
    lastStageRef.stage = stage;
    var navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 64;
    var h = H - navH, mid = navH + h / 2;
    var k = Math.min(W * 0.5 * 0.86 / 100, h * 0.88 / 100);
    var R = { cx: W * 0.735, cy: mid }, L = { cx: W * 0.265, cy: mid };
    var place = {
      pigeon: { cx: W * 0.675, cy: mid + h * 0.015, k: k * 0.92, rot: -4 },
      photo: { cx: R.cx, cy: R.cy, k: k, rot: 0 },
      hand: { cx: L.cx, cy: L.cy, k: k, rot: 0 },
      note: { cx: R.cx, cy: R.cy, k: k * 1.02, rot: -4 },
      address: { cx: L.cx, cy: L.cy, k: k * 1.02, rot: 3 }
    };
    place.carry = place.pigeon;
    var S = {};
    Object.keys(place).forEach(function (n) { S[n] = PS.px(SC[n], place[n]); });
    S.address.note.r = 3; S.note.note.r = -4;
    var scat = PS.scatter(S.pigeon, place.pigeon, W, H, W * 0.5);

    /* ground the facts band on the pigeon's baseline */
    var band = $('#band'), bh = band.offsetHeight, th = Math.tan(4 * Math.PI / 180);
    var rad = -4 * Math.PI / 180, ox = (44 - 50) * place.pigeon.k, oy = (88 - 50) * place.pigeon.k;
    var fx = place.pigeon.cx + ox * Math.cos(rad) - oy * Math.sin(rad), fy = place.pigeon.cy + ox * Math.sin(rad) + oy * Math.cos(rad);
    var yEdge = fy + th * (fx - W / 2);
    band.style.top = Math.round(yEdge + bh / 2 / Math.cos(4 * Math.PI / 180) - bh / 2) + 'px';

    PS.setState(stage, scat);
    /* note starts parked where it will be drawn, hidden */
    gsap.set(stage.note.g, { x: S.note.note.x, y: S.note.note.y, rotation: S.note.note.r, scale: S.note.note.s, transformOrigin: '50% 50%' });
    gsap.set(stage.note.fly, { autoAlpha: 0 });

    var ticks = $$('.ticks i');
    var T = { asm: [0, 7], carry: [7, 11.5], s1: 12, s2: 21, s3: 30, draw: [36, 8], s4: 44, total: 54 };
    var tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: construct, start: 'top top', end: function () { return '+=' + Math.round(construct.clientHeight * 5.4); },
        pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: function (self) {
          var t = self.progress * T.total;
          var n = t >= T.s4 + 2 ? 4 : t >= T.s3 + 2 ? 3 : t >= T.s2 + 2 ? 2 : t >= T.s1 + 2 ? 1 : 0;
          ticks.forEach(function (i, j) { i.classList.toggle('on', j < n); });
        }
      }
    });
    tl.to(stage.spin, { rotation: 720, duration: T.total, ease: 'none' }, 0);

    PS.morph(tl, stage, S.pigeon, T.asm[0], T.asm[1] - T.asm[0]);
    PS.morph(tl, stage, S.carry, T.carry[0], T.carry[1] - T.carry[0], { ease: 'power2.inOut' });
    PS.morph(tl, stage, S.photo, T.s1, 6, { spin: true });
    PS.morph(tl, stage, S.hand, T.s2, 6, { spin: true });
    PS.morph(tl, stage, S.note, T.s3, 6, { spin: true });
    tl.to(stage.note.fly, { autoAlpha: 1, duration: 0.1 }, T.s3 + 5.2);
    addNoteDraw(tl, stage, T.draw[0], T.draw[1]);
    PS.morph(tl, stage, S.address, T.s4, 6, { spin: true });

    /* colour wipes: hard diagonals sweep the next poster colour across */
    var wipes = [
      ['polygon(0% 0%, 0% 0%, -40% 100%, 0% 100%)', 'polygon(0% 0%, 140% 0%, 100% 100%, 0% 100%)'],
      ['polygon(100% 0%, 100% 0%, 140% 100%, 100% 100%)', 'polygon(100% 0%, -40% 0%, 0% 100%, 100% 100%)'],
      ['polygon(0% 0%, 100% 0%, 100% 0%, 0% -40%)', 'polygon(0% 0%, 100% 0%, 100% 140%, 0% 100%)'],
      ['polygon(0% 100%, 0% 100%, 100% 140%, 100% 100%)', 'polygon(0% 100%, 0% -40%, 100% 0%, 100% 100%)']
    ];
    var starts = [T.s1, T.s2, T.s3, T.s4];
    $$('.wipe').forEach(function (w, i) {
      tl.fromTo(w, { clipPath: wipes[i][0] }, { clipPath: wipes[i][1], duration: 5, ease: 'power3.inOut' }, starts[i]);
    });

    /* hero copy + band leave; tab arrives */
    tl.fromTo('.hero-copy', { clipPath: 'inset(-10% -10% -10% -10%)', x: 0 }, { clipPath: 'inset(-10% -10% -10% 115%)', x: -50, duration: 2.6, ease: 'power3.in' }, 10.8);
    tl.to('.hero-copy', { autoAlpha: 0, duration: 0.01 }, 13.4);
    tl.to('#band', { x: -W * 1.4, duration: 3.4, ease: 'power3.in' }, 10.5);
    tl.fromTo('.how__tab', { autoAlpha: 0, y: -24 }, { autoAlpha: 1, y: 0, duration: 1.6, ease: 'power3.out' }, T.s1 + 3);

    /* step copy in/out */
    var steps = $$('.poster--step');
    steps.forEach(function (st, i) {
      var copy = $('.step-copy', st), kids = copy.children, at = starts[i] + 3, dir = i % 2 ? 1 : -1;
      tl.fromTo(kids, { autoAlpha: 0, y: 60, clipPath: 'inset(0% 0% 100% 0%)' },
        { autoAlpha: 1, y: 0, clipPath: 'inset(-12% -6% -12% -6%)', duration: 1.7, stagger: 0.4, ease: 'power3.out' }, at);
      if (i < steps.length - 1) {
        tl.to(copy, { autoAlpha: 0, x: dir * 70, duration: 1.8, ease: 'power2.in' }, starts[i + 1] - 0.4);
      }
    });

    /* ending: hold on the address poster */
    tl.to({}, { duration: 0.01 }, T.total);
    var st = tl.scrollTrigger, howLink = $('a[href="#how"]');
    function goHow(e) {
      e.preventDefault();
      window.scrollTo({ top: st.start + (st.end - st.start) * ((T.s1 + 7) / T.total), behavior: 'smooth' });
    }
    howLink.addEventListener('click', goHow);
    ScrollTrigger.refresh();
    return function () { html.classList.remove('is-pin'); howLink.removeEventListener('click', goHow); };
  }

  /* ---------------------------------------------------------------- small stages (mobile, reduced motion) */
  function miniStage(art, names, o) {
    o = o || {};
    var svg = art.querySelector(':scope > svg');
    var w = art.clientWidth, hh = art.clientHeight;
    if (!svg || !w || !hh) return null;
    sizeSvg(svg, w, hh);
    var withNote = names.indexOf('note') > -1 || names.indexOf('address') > -1;
    var stage = PS.makeStage(svg, withNote ? { note: noteSrc } : {});
    var k = Math.min(w / (o.fitW || 104), hh / (o.fitH || 104)), cx = w / 2 + (o.dx || 0) * k, cy = hh / 2 + (o.dy || 0) * k;
    var S = names.map(function (n) {
      var s = PS.px(SC[n], { cx: cx, cy: cy, k: k, rot: (o.rot && o.rot[n]) || 0 });
      if (o.recolor) s = recolor(s, o.recolor);
      return s;
    });
    return { stage: stage, S: S, w: w, h: hh, k: k, cx: cx, cy: cy };
  }

  function finalState(m, last) {
    PS.setState(m.stage, m.S[last == null ? m.S.length - 1 : last]);
    gsap.set(m.stage.spin, { rotation: 24 });
    if (m.stage.note) finishNote(m.stage);
  }

  function buildMinis(reduced, only) {
    if (!only) html.classList.remove('is-pin');
    var jobs = [
      { hero: true, art: $('#heroArt'), names: ['pigeon', 'carry'], o: { fitW: 128, fitH: 104, dx: 6 } },
      { art: $('[data-step="1"] .art'), names: ['photo'] },
      { art: $('[data-step="2"] .art'), names: ['hand'] },
      { art: $('[data-step="3"] .art'), names: ['note'], draw: true, o: { rot: { note: -4 } } },
      { art: $('[data-step="4"] .art'), names: ['note', 'address'], draw: true, o: { rot: { note: -4, address: 3 } } },
      { close: true, art: $('#closeArt'), names: ['pigeon', 'carry'], o: { fitW: 128, fitH: 104, dx: 6, recolor: { '#C9221A': C.paper } } }
    ];
    if (only === 'close') jobs = jobs.filter(function (j) { return j.close; });
    jobs.forEach(function (j, idx) {
      var m = miniStage(j.art, j.names, j.o);
      if (!m) return;
      if (reduced) { finalState(m); return; }
      var first = m.S[0];
      var scat = PS.scatter(first, { cx: m.cx, cy: m.cy, k: m.k }, m.w, m.h, -m.w);
      /* keep the scatter on screen for small stages */
      PS.PIECES.forEach(function (id) {
        var p = scat.pieces[id];
        p.x = Math.max(24, Math.min(m.w - 24, p.x)); p.y = Math.max(24, Math.min(m.h - 24, p.y));
      });
      PS.setState(m.stage, scat);
      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: j.art, scrub: 0.6,
          start: j.hero ? 'top 38%' : 'top 82%',
          end: j.hero ? 'bottom 8%' : (j.draw ? 'bottom 38%' : 'bottom 52%')
        }, defaults: { ease: 'power2.inOut' }
      });
      var len = j.draw ? 10 : (j.names.length > 1 ? 10 : 6);
      tl.to(m.stage.spin, { rotation: 200, duration: len, ease: 'none' }, 0);
      if (j.names[0] === 'note') {
        gsap.set(m.stage.note.fly, { autoAlpha: 0 });
        gsap.set(m.stage.note.g, { x: m.S[0].note.x, y: m.S[0].note.y, rotation: m.S[0].note.r, scale: m.S[0].note.s, transformOrigin: '50% 50%' });
      }
      if (j.names.length === 1 && !j.draw) {
        PS.morph(tl, m.stage, first, 0, 6);
      } else if (j.names[0] === 'pigeon' || j.names[0] === 'carry') {
        PS.morph(tl, m.stage, m.S[0], 0, 6);
        PS.morph(tl, m.stage, m.S[1], 6.2, 3.8);
      } else if (j.names[0] === 'note' && j.names.length === 1) {
        PS.morph(tl, m.stage, first, 0, 5);
        tl.to(m.stage.note.fly, { autoAlpha: 1, duration: 0.1 }, 4.4);
        addNoteDraw(tl, m.stage, 5, 5);
      } else {
        /* step 4: card + note arrive, then rotate into the address side */
        PS.morph(tl, m.stage, m.S[0], 0, 4);
        tl.to(m.stage.note.fly, { autoAlpha: 1, duration: 0.1 }, 3.6);
        finishNote(m.stage);
        PS.morph(tl, m.stage, m.S[1], 4.4, 4.4, { spin: true });
      }
    });
    if (!reduced) {
      /* hero band is positioned in CSS on small screens */
    }
    return function () {};
  }

  /* ---------------------------------------------------------------- the rest of the page */
  function sectionMotion(reduced) {
    var letters = $$('[data-letters] .lt');
    if (reduced) return;

    /* headline reveals: hard wipes from the left */
    $$('[data-reveal]').forEach(function (el) {
      gsap.fromTo(el, { clipPath: 'inset(-20% 100% -20% 0%)', x: -28 }, {
        clipPath: 'inset(-20% 0% -20% 0%)', x: 0, duration: 0.9, ease: 'power3.out', clearProps: 'clipPath',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      });
    });

    /* clock hands: big half-circles turn with the scroll */
    gsap.fromTo('.own__sweep', { rotation: -40 }, { rotation: 200, ease: 'none', scrollTrigger: { trigger: '.own', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.faq__sweep', { rotation: 30 }, { rotation: -210, ease: 'none', scrollTrigger: { trigger: '.faq', start: 'top bottom', end: 'bottom top', scrub: true } });

    /* letters get found: boxes appear across both sheets */
    if (letters.length) {
      gsap.fromTo(letters, { '--b': 0 }, {
        '--b': 1, duration: 0.5, stagger: 0.04, ease: 'none',
        scrollTrigger: { trigger: '.own__art', start: 'top 72%', end: 'bottom 62%', scrub: 0.5 }
      });
      gsap.from('.sheet--a', { x: -60, rotation: -12, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.own__art', start: 'top 85%', once: true } });
      gsap.from('.sheet--b', { x: 80, rotation: 10, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.own__art', start: 'top 80%', once: true } });
      gsap.from('.own__disc', { scale: 0.2, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: '.own__art', start: 'top 85%', once: true } });
    }

    /* pricing: the $ and the 4 are built from bars and a disc */
    var g = '.price__glyph';
    var gt = gsap.timeline({ scrollTrigger: { trigger: g, start: 'top 92%', end: 'top 40%', scrub: 0.6 }, defaults: { ease: 'power3.out' } });
    gt.from('.pg-coin', { x: -240, y: 60, rotation: -200, svgOrigin: '62 80' }, 0)
      .from('.pg-stem', { y: -260, rotation: 14, svgOrigin: '201 80' }, 0.1)
      .from('.pg-bar', { x: 320, svgOrigin: '187 111' }, 0.2)
      .from('.pg-diag', { y: 280, x: -60, rotation: 70, svgOrigin: '160 56' }, 0.3);
    ScrollTrigger.batch('.cv', {
      start: 'top 92%', once: true,
      onEnter: function (els) { gsap.fromTo(els, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, stagger: 0.14, ease: 'power3.out', clearProps: 'clipPath' }); }
    });
    gsap.from('.plan', { y: 90, autoAlpha: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.plan', start: 'top 92%', once: true } });
    gsap.from('.acc__item', { x: 60, autoAlpha: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: '.acc', start: 'top 88%', once: true } });
  }

  /* ---------------------------------------------------------------- static bits (all modes) */
  function wrapLetters() {
    $$('[data-letters]').forEach(function (p) {
      var text = p.textContent; p.textContent = '';
      text.split(' ').forEach(function (word, wi, arr) {
        var w = document.createElement('span'); w.className = 'w';
        word.split('').forEach(function (ch) {
          var s = document.createElement('span');
          if (/[a-z]/i.test(ch)) s.className = 'lt';
          s.textContent = ch; w.appendChild(s);
        });
        p.appendChild(w);
        if (wi < arr.length - 1) p.appendChild(document.createTextNode(' '));
      });
    });
  }

  function accordion() {
    var items = $$('.acc__item');
    var motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    function set(item, open, instant) {
      var btn = $('.acc__q', item), panel = $('.acc__a', item);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      item.classList.toggle('is-open', open);
      if (open) {
        panel.hidden = false;
        if (motion && !instant) gsap.fromTo(panel, { height: 0 }, { height: 'auto', duration: 0.35, ease: 'power3.out', clearProps: 'height' });
      } else if (motion && !instant) {
        gsap.to(panel, { height: 0, duration: 0.22, ease: 'power3.in', onComplete: function () { panel.hidden = true; gsap.set(panel, { clearProps: 'height' }); } });
      } else { panel.hidden = true; }
    }
    items.forEach(function (item) {
      $('.acc__q', item).addEventListener('click', function () {
        var open = this.getAttribute('aria-expanded') !== 'true';
        items.forEach(function (o) { if (o !== item && o.classList.contains('is-open')) set(o, false); });
        set(item, open);
      });
    });
    set(items[0], true, true);
  }

  function navMenu() {
    var nav = $('#nav'), btn = $('#menuBtn');
    function close() { nav.removeAttribute('data-open'); btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function () {
      var open = nav.hasAttribute('data-open');
      if (open) close(); else { nav.setAttribute('data-open', ''); btn.setAttribute('aria-expanded', 'true'); }
    });
    $$('#navlinks a').forEach(function (a) { a.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); btn.focus(); } });
    matchMedia('(min-width: 900px)').addEventListener('change', close);
  }

  /* ---------------------------------------------------------------- boot */
  var mm;
  function init() {
    if (mm) mm.revert();
    mm = gsap.matchMedia();
    mm.add({
      pin: '(min-width: 900px) and (prefers-reduced-motion: no-preference)',
      stack: '(max-width: 899px) and (prefers-reduced-motion: no-preference)',
      reduce: '(prefers-reduced-motion: reduce)'
    }, function (ctx) {
      var c = ctx.conditions, cleanup;
      if (c.pin) {
        cleanup = buildPinned();
        buildMinis(false, 'close');
        marquee(false);
        if (firstBuild) { introHero(lastStageRef.stage, construct.clientWidth, construct.clientHeight); }
        introCopy();
        sectionMotion(false);
      } else if (c.stack) {
        cleanup = buildMinis(false);
        marquee(false);
        introCopy();
        sectionMotion(false);
      } else {
        cleanup = buildMinis(true);
        marquee(true);
        sectionMotion(true);
        gsap.set('.how__tab', { clearProps: 'all' });
      }
      html.classList.remove('hold');
      firstBuild = false;
      return cleanup;
    });
  }
  wrapLetters();
  accordion();
  navMenu();
  init();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
  var rt, lw = innerWidth, lh = innerHeight;
  addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (innerWidth !== lw || Math.abs(innerHeight - lh) > 140) { lw = innerWidth; lh = innerHeight; init(); }
    }, 300);
  });
})();
