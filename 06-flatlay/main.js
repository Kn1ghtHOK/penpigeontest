/* PenPigeon desk flat-lay.
   Desktop: one pinned "camera" (the .camera viewport) looks down at a big stage. A scrubbed GSAP timeline
   moves the camera (pan, zoom dips, a little roll) between zones; objects sit at three depths and parallax.
   In the pen zone a brass pen rides MotionPath along the real note path while ScrollTrigger scrubs it.
   Phones / short windows: no pin, objects drop in as they enter, the pen writes as the card passes.
   Reduced motion / no JS: everything is already on the desk, the note already written. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;

  if (!window.gsap || !window.ScrollTrigger) { root.classList.remove('cam'); return; }
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, DrawSVGPlugin, SplitText, ScrollToPlugin, CustomEase);
  ScrollTrigger.config({ ignoreMobileResize: true });

  var camEl = $('#camera');
  var stage = $('#stage');
  var DW = 1280, DH = 800;         // one zone, in design units
  var SPU = 0.62;                  // viewport heights of scroll per timeline unit

  /* ---------------------------------------------------------------- small UI */
  // FAQ accordion: first answer open, the rest closed (all open without JS)
  $$('.faq button').forEach(function (btn, i) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (i > 0) { panel.classList.add('is-closed'); btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function () {
      var closed = panel.classList.toggle('is-closed');
      btn.setAttribute('aria-expanded', closed ? 'false' : 'true');
    });
  });

  // phone menu
  var nav = $('#nav'), menuBtn = $('.menu-btn');
  function setMenu(open) { nav.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  $$('#nav-links a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });

  /* ---------------------------------------------------------------- the note: real plotted path */
  var notePaths = $$('#notePaths path');
  var noteSvg = $('#note');
  var NS = 'http://www.w3.org/2000/svg';
  var note = (function () {
    var lens = [], starts = [], ends = [], gaps = [], d = '';
    notePaths.forEach(function (p, i) {
      var L = p.getTotalLength();
      lens.push(L);
      starts.push(p.getPointAtLength(0));
      ends.push(p.getPointAtLength(L));
      var s = p.getAttribute('d');
      d += (i ? s.replace(/^\s*M/, ' L') : s);
    });
    var gapSum = 0;
    for (var i = 0; i < notePaths.length - 1; i++) {
      var g = Math.hypot(starts[i + 1].x - ends[i].x, starts[i + 1].y - ends[i].y);
      gaps.push(g); gapSum += g;
    }
    var total = lens.reduce(function (a, b) { return a + b; }, 0) + gapSum;
    var S = [], E = [], run = 0;
    for (var j = 0; j < lens.length; j++) { S.push(run / total); run += lens[j]; E.push(run / total); run += (gaps[j] || 0); }
    var track = document.createElementNS(NS, 'path');
    track.setAttribute('id', 'penTrack');
    track.setAttribute('d', d);
    track.setAttribute('fill', 'none');
    track.setAttribute('stroke', 'none');
    noteSvg.appendChild(track);
    return { lens: lens, S: S, E: E, total: total, n: lens.length };
  })();

  var penG = $('#penG'), penShadow = $('#penShadow'), countN = $('#count-n');
  var penLift = { v: 0 }, lastCount = -1, lastLift = -1;
  function applyPen(p) {
    var i = 0, k, lift = 0;
    for (k = 0; k < note.n; k++) { if (p >= note.S[k]) i = k; }
    if (p <= 0) { i = -1; }
    var inGap = i >= 0 && i < note.n - 1 && p > note.E[i];
    if (inGap) {
      var span = note.S[i + 1] - note.E[i];
      var ramp = Math.min(span / 2, 14 / note.total);
      lift = Math.min(1, Math.min(p - note.E[i], note.S[i + 1] - p) / ramp);
    }
    if (p >= 1) { i = note.n - 1; }
    lift = Math.max(lift, penLift.v);
    var count = Math.max(0, i + 1);
    if (count !== lastCount) { countN.textContent = count; lastCount = count; }
    if (Math.abs(lift - lastLift) > 0.01) {
      penShadow.setAttribute('transform', 'translate(' + (3 + lift * 12).toFixed(2) + ' ' + (4 + lift * 18).toFixed(2) + ')');
      lastLift = lift;
    }
  }

  // The write timeline: pen along the track, ink drawn stroke by stroke, then the pen floats off.
  function buildWrite(D) {
    var w = gsap.timeline({ defaults: { ease: 'none' } });
    w.to(penG, { opacity: 1, duration: 0.001 }, 0);
    w.to(penG, {
      motionPath: { path: '#penTrack', autoRotate: false },
      duration: D, ease: 'none',
      onUpdate: function () { applyPen(this.progress()); }
    }, 0);
    notePaths.forEach(function (p, i) {
      w.fromTo(p, { strokeDashoffset: note.lens[i] + 0.01 }, { strokeDashoffset: 0, duration: D * (note.lens[i] / note.total) }, D * note.S[i]);
    });
    w.to(penLift, { v: 1, duration: D * 0.04, onUpdate: function () { applyPen(1); } }, D);
    w.to(penG, { x: '+=190', y: '-=140', opacity: 0, duration: D * 0.09, ease: 'power2.in' }, D + D * 0.02);
    return w;
  }
  function primeNote() {
    notePaths.forEach(function (p, i) {
      p.style.strokeDasharray = note.lens[i] + ' ' + (note.lens[i] + 4);
      p.style.strokeDashoffset = note.lens[i] + 0.01;
    });
    penG.classList.add('live');
    gsap.set(penG, { opacity: 0 });
    penLift.v = 0; lastCount = -1; lastLift = -1;
    applyPen(0);
  }
  function clearNote() {
    notePaths.forEach(function (p) { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; });
    penG.classList.remove('live');
    gsap.set(penG, { clearProps: 'all' });
    countN.textContent = note.n;
  }

  /* ---------------------------------------------------------------- decorative bits built from the page's own fonts/paths */
  var wobbleBuilt = false;
  function buildWobble() {
    if (wobbleBuilt) return; wobbleBuilt = true;
    // "same word, drawn twice": the second draw gets a little wobble per stroke
    var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 - 0.5; }
    var a = $('.w-a'), b = $('.w-b');
    if (!a || !b) return;
    $$('path', a).forEach(function (p) {
      var c = p.cloneNode(false);
      c.setAttribute('transform', 'translate(' + (rnd() * 4.5).toFixed(2) + ' ' + (rnd() * 4).toFixed(2) + ') rotate(' + (rnd() * 4.5).toFixed(2) + ' 70 55)');
      b.appendChild(c);
    });
  }
  // Detection boxes round each letter of the pangram samples. Needs the real font, so it runs after fonts load.
  function buildBoxes() {
    var made = [];
    ['a', 'b'].forEach(function (k) {
      var g = document.getElementById('boxes-' + k);
      if (!g) return;
      while (g.firstChild) g.removeChild(g.firstChild);
      [1, 2, 3].forEach(function (n) {
        var t = document.getElementById('pg-' + k + n);
        if (!t || !t.getExtentOfChar) return;
        var fs = parseFloat(t.getAttribute('data-fs') || t.getAttribute('font-size'));
        t.setAttribute('data-fs', fs); t.setAttribute('font-size', fs);
        var len = t.getComputedTextLength();
        if (len > 486) { fs = fs * 486 / len; t.setAttribute('font-size', fs.toFixed(1)); }
        var y0 = parseFloat(t.getAttribute('y')), txt = t.textContent;
        for (var i = 0; i < txt.length; i++) {
          if (txt[i] === ' ') continue;
          var e = t.getExtentOfChar(i);
          var r = document.createElementNS(NS, 'rect');
          r.setAttribute('x', (e.x + 1).toFixed(1)); r.setAttribute('width', Math.max(6, e.width - 2).toFixed(1));
          r.setAttribute('y', (y0 - fs * 0.64).toFixed(1)); r.setAttribute('height', (fs * 0.9).toFixed(1));
          r.setAttribute('rx', '1.5');
          g.appendChild(r); made.push(r);
        }
      });
    });
    return made;
  }

  /* ---------------------------------------------------------------- drops: objects land on the desk */
  function makeDrop(zone) {
    var items = $$('[data-drop]', zone).filter(function (el) { return el.offsetParent !== null || getComputedStyle(el).position === 'fixed'; });
    var tl = gsap.timeline({ paused: true });
    items.forEach(function (el, i) {
      var layer = el.closest('.layer');
      var hi = layer && layer.classList.contains('l2') ? 1.7 : layer && layer.classList.contains('l1') ? 1.25 : 1;
      var dir = i % 2 ? 1 : -1;
      var at = i * 0.07;
      tl.from(el, { y: -60 * hi, scale: 1.06, opacity: 0, '--lift': 1.9 * hi, duration: 0.85, ease: 'power3.out', immediateRender: true }, at);
      tl.from(el, { rotation: '+=' + (dir * (4 + (i % 3) * 2.2)), duration: 1.15, ease: 'back.out(2.2)', immediateRender: true }, at);
    });
    var pm = $('.thunk', zone);
    if (pm) {
      tl.from(pm, { scale: 2.1, opacity: 0, rotation: '-=26', duration: 0.42, ease: 'power4.in', immediateRender: true }, Math.max(0.9, items.length * 0.07 + 0.3));
    }
    return tl;
  }

  // Stamp thunk on the sample postcard
  var bigMark = $('#postmark-big');

  /* ---------------------------------------------------------------- camera mode */
  function runCam() {
    var zones = $$('.zone');
    var Z = {};
    zones.forEach(function (el) {
      var key = el.dataset.zone;
      var fit = Math.min(1, DH / el.offsetHeight) * 0.99;
      Z[key] = { el: el, x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 - (key === 'hero' ? 0 : 26), z: key === 'hero' ? 1 : fit };
    });
    var state = { x: Z.hero.x, y: Z.hero.y, z: 1, r: 0 };

    // parallax layers: higher objects drift a little further than the desk when the camera travels
    var layers = [];
    zones.forEach(function (zn) {
      var cx = zn.offsetLeft + zn.offsetWidth / 2, cy = zn.offsetTop + zn.offsetHeight / 2;
      $$('.layer.l1, .layer.l2', zn).forEach(function (el) { layers.push({ el: el, cx: cx, cy: cy, k: el.classList.contains('l2') ? 0.085 : 0.04 }); });
    });
    var fillLayer = $('.fill-layer');
    layers.push({ el: fillLayer, cx: stage.offsetWidth / 2, cy: stage.offsetHeight / 2, k: 0.05 });

    var vw = camEl.clientWidth, vh = camEl.clientHeight;
    function render() {
      vw = camEl.clientWidth; vh = camEl.clientHeight;
      var f = Math.min(vw / DW, vh / DH), s = state.z * f;
      var a = state.r * Math.PI / 180, c = Math.cos(a) * s, n = Math.sin(a) * s;
      var tx = vw / 2 - (state.x * c - state.y * n), ty = vh / 2 - (state.x * n + state.y * c);
      stage.style.transform = 'matrix(' + c + ',' + n + ',' + (-n) + ',' + c + ',' + tx + ',' + ty + ')';
      for (var i = 0; i < layers.length; i++) {
        var L = layers[i];
        L.el.style.transform = 'translate(' + ((L.cx - state.x) * L.k).toFixed(1) + 'px,' + ((L.cy - state.y) * L.k).toFixed(1) + 'px)';
      }
    }

    // ---- build the camera timeline (1 unit = SPU viewport heights of scroll)
    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      onUpdate: render,
      scrollTrigger: {
        trigger: camEl, start: 'top top',
        end: function () { return '+=' + Math.round(tl.duration() * SPU * window.innerHeight); },
        pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true
      }
    });
    var cur = { x: state.x, y: state.y, z: 1, r: 0 };
    var t = 0;
    var arrive = {}, mid = {};

    function hold(key, dur, dx, dy) {
      var z = Z[key];
      tl.fromTo(state, { x: cur.x, y: cur.y }, { x: cur.x + (dx || 0), y: cur.y + (dy || 0), duration: dur }, t);
      cur.x += (dx || 0); cur.y += (dy || 0);
      mid[key] = t + dur / 2;
      t += dur;
    }
    function travel(key, dur, roll) {
      var to = Z[key], at = t;
      var dip = Math.min(cur.z, to.z) * 0.84;
      tl.fromTo(state, { x: cur.x, y: cur.y }, { x: to.x, y: to.y, duration: dur, ease: 'power2.inOut' }, at);
      tl.fromTo(state, { z: cur.z }, { z: dip, duration: dur * 0.5, ease: 'sine.inOut' }, at);
      tl.fromTo(state, { z: dip }, { z: to.z, duration: dur * 0.5, ease: 'sine.inOut' }, at + dur * 0.5);
      tl.fromTo(state, { r: 0 }, { r: roll, duration: dur * 0.5, ease: 'sine.inOut' }, at);
      tl.fromTo(state, { r: roll }, { r: 0, duration: dur * 0.5, ease: 'sine.inOut' }, at + dur * 0.5);
      arrive[key] = at + dur * 0.55;
      cur = { x: to.x, y: to.y, z: to.z, r: 0 };
      t += dur;
    }

    arrive.hero = 0;
    hold('hero', 0.5, 18, 10);
    travel('how', 0.9, -1.3);   hold('how', 1.5, -26, 12);
    travel('pen', 0.9, 1.1);    hold('pen', 0.5, 14, 6);

    // push in to the note, write it, pull back for the postmark
    var pz = Z.pen;
    var bigcard = $('#bigcard');
    var nW = bigcard.offsetWidth * 0.52, nH = nW * 175.2 / 563.2;   // the note svg is placed by percentages (see .note)
    var close = {
      x: pz.el.offsetLeft + bigcard.offsetLeft + bigcard.offsetWidth * 0.05 + nW * 0.56,
      y: pz.el.offsetTop + bigcard.offsetTop + bigcard.offsetHeight * 0.23 + nH * 0.2 - 58,
      z: 0.44 * DW / nW
    };
    var pushDur = 0.6, writeDur = 2.6, pullDur = 0.6;
    tl.fromTo(state, { x: cur.x, y: cur.y }, { x: close.x, y: close.y, duration: pushDur, ease: 'power2.inOut' }, t);
    tl.fromTo(state, { z: cur.z }, { z: close.z, duration: pushDur, ease: 'power2.inOut' }, t);
    var writeAt = t + pushDur;
    primeNote();
    tl.add(buildWrite(writeDur), writeAt);
    tl.fromTo(state, { x: close.x, y: close.y }, { x: close.x + 40, y: close.y + 4, duration: writeDur }, writeAt);
    var pullAt = writeAt + writeDur + 0.12;
    tl.fromTo(state, { x: close.x + 40, y: close.y + 4 }, { x: pz.x, y: pz.y, duration: pullDur, ease: 'power2.inOut' }, pullAt);
    tl.fromTo(state, { z: close.z }, { z: pz.z, duration: pullDur, ease: 'power2.inOut' }, pullAt);
    gsap.set(bigMark, { autoAlpha: 0 });
    tl.fromTo(bigMark, { scale: 2, autoAlpha: 0, rotation: -30 }, { scale: 1, autoAlpha: 0.85, rotation: -12, duration: 0.2, ease: 'power4.in' }, pullAt - 0.02);
    cur = { x: pz.x, y: pz.y, z: pz.z, r: 0 };
    t = pullAt + pullDur;
    mid.pen = writeAt + writeDur * 0.4;
    t += 0.3; // little rest after the stamp

    travel('hand', 0.9, -1.2);  hold('hand', 1.3, 22, -8);
    travel('price', 0.9, 1.2);  hold('price', 1.1, -20, 10);
    travel('faq', 0.9, -1.1);   hold('faq', 1.2, 16, -10);
    travel('close', 0.9, 1.3);  hold('close', 1.0, 0, 10);

    render();
    root.classList.add('cam-ready');

    var st = tl.scrollTrigger;
    function scrollAt(time) { return st.start + (time / tl.duration()) * (st.end - st.start); }

    // zone arrival: the objects land when the camera gets there
    var drops = {};
    ['how', 'pen', 'hand', 'price', 'faq', 'close'].forEach(function (key) {
      var d = makeDrop(Z[key].el);
      drops[key] = d;
      if (key === 'hand') {
        var tiles = $$('.tiles li', Z.hand.el);
        d.from(tiles, { y: -18, opacity: 0, duration: 0.5, stagger: 0.03, ease: 'back.out(2)' }, 1.4);
      }
      ScrollTrigger.create({
        start: function () { return scrollAt(arrive[key]); },
        end: function () { return scrollAt(arrive[key]) + 1; },
        onEnter: function () { d.timeScale(1).play(); },
        onLeaveBack: function () { d.pause(0); }
      });
    });
    buildWobble();
    var heroDrop = makeDrop(Z.hero.el);

    // keyboard: if focus lands on something offscreen, bring the camera to it
    function goTo(key, instant) {
      var y = scrollAt(mid[key] != null ? mid[key] : arrive[key]);
      if (instant) window.scrollTo(0, y);
      else gsap.to(window, { scrollTo: { y: y, autoKill: true }, duration: 1.7, ease: 'power2.inOut' });
    }
    var zoneKey = { top: 'hero', how: 'how', watch: 'pen', handwriting: 'hand', pricing: 'price', faq: 'faq', try: 'close' };
    function onClick(e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      if (!zoneKey[id]) return;
      e.preventDefault();
      if (zoneKey[id] === 'hero') gsap.to(window, { scrollTo: 0, duration: 1.7, ease: 'power2.inOut' });
      else goTo(zoneKey[id]);
      history.replaceState(null, '', '#' + id);
    }
    function onFocus(e) {
      var zn = e.target.closest && e.target.closest('.zone');
      if (!zn) return;
      var key = zoneKey[zn.id];
      var target = key === 'hero' ? st.start : scrollAt(mid[key] != null ? mid[key] : arrive[key]);
      if (Math.abs(window.scrollY - target) > window.innerHeight * 0.5) window.scrollTo(0, target);
      camEl.scrollTop = 0; camEl.scrollLeft = 0;
    }
    document.addEventListener('click', onClick);
    stage.addEventListener('focusin', onFocus);
    ScrollTrigger.addEventListener('refresh', render);

    // deep link on load
    if (location.hash && zoneKey[location.hash.slice(1)] && zoneKey[location.hash.slice(1)] !== 'hero') {
      requestAnimationFrame(function () { goTo(zoneKey[location.hash.slice(1)], true); });
    }

    return {
      heroDrop: heroDrop,
      afterFonts: function () {
        var boxes = buildBoxes();
        gsap.set(boxes, { drawSVG: '0% 0%' });
        drops.hand.to(boxes, { drawSVG: '0% 100%', duration: 0.5, stagger: { each: 0.012, from: 'start' }, ease: 'power2.out' }, 1.0);
      },
      cleanup: function () {
        document.removeEventListener('click', onClick);
        stage.removeEventListener('focusin', onFocus);
        ScrollTrigger.removeEventListener('refresh', render);
        stage.style.transform = '';
        layers.forEach(function (L) { L.el.style.transform = ''; });
        root.classList.remove('cam-ready');
        clearNote();
      }
    };
  }

  /* ---------------------------------------------------------------- flow mode (phones, short windows) */
  function runFlow() {
    primeNote();
    // objects land as they come up the page
    var els = $$('[data-drop]').filter(function (el) { return el.offsetParent !== null; });
    gsap.set(els, { opacity: 0 });
    ScrollTrigger.batch(els, {
      start: 'top 92%', once: true,
      onEnter: function (batch) {
        batch.forEach(function (el, i) {
          var dir = i % 2 ? 1 : -1;
          gsap.fromTo(el, { y: -40, scale: 1.04, opacity: 0, '--lift': 1.6, rotation: '+=' + (dir * 4) },
            { y: 0, scale: 1, opacity: 1, '--lift': 0, rotation: '-=' + (dir * 4), duration: 0.9, delay: i * 0.08, ease: 'back.out(1.6)', overwrite: 'auto' });
        });
      }
    });
    // the pen writes while the card crosses the screen
    var w = buildWrite(1);
    ScrollTrigger.create({ animation: w, trigger: '#bigcard', start: 'top 72%', end: 'bottom 52%', scrub: 0.6 });
    gsap.set(bigMark, { autoAlpha: 0 });
    gsap.fromTo(bigMark, { scale: 2, autoAlpha: 0, rotation: -30 }, { scale: 1, autoAlpha: 0.85, rotation: -12, duration: 0.3, ease: 'power4.in',
      scrollTrigger: { trigger: '#bigcard', start: 'bottom 56%', toggleActions: 'play none none reverse' } });
    buildWobble();
    return {
      afterFonts: function () {
        var boxes = buildBoxes();
        gsap.set(boxes, { drawSVG: '0% 0%' });
        ['#boxes-a', '#boxes-b'].forEach(function (sel) {
          gsap.to($$('rect', $(sel)), { drawSVG: '0% 100%', duration: 0.5, stagger: 0.012, ease: 'power2.out', scrollTrigger: { trigger: sel, start: 'top 82%', once: true } });
        });
      },
      cleanup: function () { clearNote(); }
    };
  }

  /* ---------------------------------------------------------------- hero intro + wiring */
  function fontsReady() {
    var loads = ['68px "Young Serif"', '20px "Special Elite"', '30px "Nanum Pen Script"', '18px "Hanken Grotesk"'].map(function (f) { return document.fonts.load(f); });
    return Promise.race([Promise.all(loads), new Promise(function (r) { setTimeout(r, 1600); })]);
  }

  var mm = gsap.matchMedia();
  mm.add({
    cam: '(min-width:1100px) and (min-height:680px) and (prefers-reduced-motion:no-preference)',
    flow: '(prefers-reduced-motion:no-preference) and (max-width:1099px), (prefers-reduced-motion:no-preference) and (max-height:679px)',
    reduce: '(prefers-reduced-motion:reduce)'
  }, function (ctx) {
    var c = ctx.conditions, mode;
    if (c.cam) { root.classList.add('cam'); }
    else { root.classList.remove('cam'); }

    var disposed = false;
    if (c.reduce) {
      // everything stays put: note fully drawn, all objects visible
      buildWobble();
      fontsReady().then(function () { if (!disposed) buildBoxes(); });
      return function () { disposed = true; };
    }

    mode = c.cam ? runCam() : runFlow();
    var heroZone = $('.z-hero');
    var h1 = $('.hero-sheet h1');
    var heroDrop = c.cam ? mode.heroDrop : null;
    var split = null;

    // hero: sheet and objects drop on first paint, headline words follow
    var heroItems = $$('[data-drop]', heroZone);
    if (!c.cam) { /* flow: batch handles the drops, only the headline needs a cue */ }
    if (h1) {
      split = SplitText.create(h1, { type: 'words', wordsClass: 'w' });
      gsap.set(split.words, { opacity: 0, y: 26 });
    }
    function play() {
      if (disposed) return;
      if (heroDrop) heroDrop.play();
      if (split) gsap.to(split.words, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, delay: c.cam ? 0.55 : 0.2, ease: 'power3.out', overwrite: 'auto' });
    }
    fontsReady().then(function () { if (disposed) return; if (mode.afterFonts) mode.afterFonts(); ScrollTrigger.refresh(); play(); });

    return function () {
      disposed = true;
      if (split) split.revert();
      mode.cleanup();
      root.classList.remove('cam');
    };
  });
})();
