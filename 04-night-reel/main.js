/* PenPigeon, Night Reel.
   One pinned master timeline (hero -> photo -> print -> flip -> pen -> stamp -> mail slot),
   then calm fades and scroll-following spotlights. GSAP + ScrollTrigger drive everything;
   reduced motion and no-JS get the static layout with the note already written. */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function unboot() { root.classList.remove('is-booting'); }

  /* ---------- mobile menu (works without GSAP) ---------- */
  var menuBtn = $('.menu-btn');
  var menu = $('#menu');
  function setMenu(open) {
    if (!menuBtn || !menu) return;
    menuBtn.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); }
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });
  }

  if (!window.gsap || !window.ScrollTrigger) { unboot(); return; }

  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, SplitText, DrawSVGPlugin);
  ScrollTrigger.config({ ignoreMobileResize: true });

  var reel = $('.reel');
  var nav = $('.nav');
  var mm = gsap.matchMedia();

  /* sticky nav fill once we leave the very top */
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: function (self) { nav.classList.toggle('is-solid', self.scroll() > 60); },
    onRefresh: function (self) { nav.classList.toggle('is-solid', self.scroll() > 60); }
  });

  /* ======================================================
     MOTION BRANCH
     ====================================================== */
  mm.add('(prefers-reduced-motion: no-preference)', function () {
    try { buildMotion(); } finally { unboot(); }
    return function () {
      reel.classList.remove('is-pinned');
    };
  });

  /* ======================================================
     REDUCED MOTION: everything visible, note already written
     ====================================================== */
  mm.add('(prefers-reduced-motion: reduce)', function () {
    unboot();
  });

  document.fonts && document.fonts.ready.then(function () { ScrollTrigger.refresh(); });

  function buildMotion() {
    reel.classList.add('is-pinned');
    var q = function (s) { return $(s, reel); };
    var small = function () { return window.innerWidth < 900 || window.innerHeight > window.innerWidth; };

    /* ---------- element refs ---------- */
    var rigClip = q('.rig-clip'), rig = q('.rig'), card = q('.card'), shadow = q('.card-shadow');
    var layerPrint = q('.layer-print'), photoInners = $$('.photo-inner', reel), scan = q('.scan'), crop = q('.crop');
    var dim = q('.dim'), gloss = q('.gloss');
    var back = q('.back'), notePaths = $$('.note .ink path', reel), pen = q('.pen'), nibGlow = q('.nib-glow');
    var addrLines = $$('.addr-line', reel), stampBox = q('.stamp-box'), stamp = q('.stamp'), postmark = q('.postmark');
    var waves = $$('.waves path', reel), ring = q('.stamp-ring'), flash = q('.flash');
    var plate = q('.slot-plate'), lip = q('.slot-lip'), stage = q('.stage'), frame = q('.frame');
    var cone = q('.lamp-cone'), pool = q('.lamp-pool'), atmos = q('.atmos'), dust = q('.dust');
    var tc = $$('.tc', reel); // 0 hero, 1-4 reels, 5 end
    var hudReel = q('.hud-reel-t'), hudTc = q('.hud-tc'), hudLine = q('.hud-line');

    /* ---------- film grain, jumping in steps ---------- */
    var grain = $('.grain');
    var gt = gsap.timeline({ repeat: -1, repeatRefresh: true });
    for (var gi = 0; gi < 6; gi++) {
      gt.set(grain, { x: function () { return gsap.utils.random(-70, 70, 1); }, y: function () { return gsap.utils.random(-70, 70, 1); } }, gi * 0.11);
    }
    gt.to({}, { duration: 0.11 });

    /* ---------- dust motes in the lamp beam ---------- */
    var motes = [];
    for (var di = 0; di < 30; di++) {
      var m = document.createElement('i');
      m.style.left = gsap.utils.random(52, 92).toFixed(1) + '%';
      m.style.top = gsap.utils.random(6, 94).toFixed(1) + '%';
      dust.appendChild(m);
      motes.push(m);
    }
    var dustTw = gsap.to(motes, {
      y: 'random(-70,-24)', x: 'random(-28,28)', opacity: 'random(0.1,0.8)',
      duration: 'random(5,10)', repeat: -1, yoyo: true, ease: 'sine.inOut',
      stagger: { each: 0.15, from: 'random' }
    });
    ScrollTrigger.create({
      trigger: reel, start: 'top bottom', end: 'bottom top',
      onToggle: function (self) { self.isActive ? dustTw.resume() : dustTw.pause(); }
    });

    /* ---------- opening: lamp warms up, title lines rise ---------- */
    gsap.set(rigClip, { opacity: 0 });
    gsap.set(atmos, { opacity: 0 });
    var intro = gsap.timeline({ delay: 0.15 });
    intro
      .to(atmos, { opacity: 1, duration: 0.01 }, 0)
      .fromTo([cone, pool], { opacity: 0 }, {
        keyframes: [{ opacity: 0.18, duration: 0.18 }, { opacity: 0.04, duration: 0.12 }, { opacity: 0.5, duration: 0.2 }, { opacity: 0.3, duration: 0.14 }, { opacity: 0.78, duration: 0.3 }, { opacity: 0.62, duration: 0.5, ease: 'sine.out' }]
      }, 0.1)
      .to(rigClip, { opacity: 1, duration: 2.4, ease: 'power2.out' }, 0.7);

    var h1 = q('.h1');
    SplitText.create(h1, {
      type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true,
      onSplit: function (self) {
        return gsap.from(self.lines, { yPercent: 112, duration: 1.5, ease: 'expo.out', stagger: 0.13, delay: 0.55 });
      }
    });
    gsap.from($$('.tc-0 .rise', reel), { y: 26, opacity: 0, duration: 1.2, ease: 'power3.out', stagger: 0.11, delay: 1.25 });
    unboot();

    /* ---------- pen geometry (each stroke: length, start/end points) ---------- */
    var strokes = notePaths.map(function (p) {
      var L = p.getTotalLength();
      var s = p.getPointAtLength(0), e = p.getPointAtLength(L);
      p.style.strokeDasharray = L + ' ' + L;
      return { el: p, L: L, sx: s.x, sy: s.y, ex: e.x, ey: e.y };
    });
    var acc = 0;
    strokes.forEach(function (s, i) {
      s.u0 = acc; acc += s.L; s.u1 = acc;
      var n = strokes[i + 1];
      s.travel = n ? Math.hypot(n.sx - s.ex, n.sy - s.ey) * 0.45 : 0;
      acc += s.travel; s.end = acc;
    });
    var totalU = acc;
    var INK = '#14232b', HOT = '#e08a1e', COOL_U = totalU * 0.07;
    var lastPen = -1;
    function applyPen(u) {
      var d = Math.min(u, 1.2) * totalU, cur = -1, px = strokes[0].sx, py = strokes[0].sy, writing = 0;
      for (var i = 0; i < strokes.length; i++) {
        var s = strokes[i], f = (d - s.u0) / s.L;
        f = f < 0 ? 0 : f > 1 ? 1 : f;
        s.el.style.strokeDashoffset = (s.L * (1 - f)).toFixed(2);
        s.el.style.opacity = f > 0 ? 1 : 0;
        if (f > 0 && f < 1) { cur = i; writing = 1; }
        if (f <= 0) { s.el.style.stroke = ''; }
        else if (f < 1) { s.el.style.stroke = HOT; }
        else {
          var age = (d - s.u1) / COOL_U;
          s.el.style.stroke = age >= 1 ? '' : gsap.utils.interpolate(HOT, INK, age < 0 ? 0 : age);
        }
      }
      for (var j = 0; j < strokes.length; j++) {
        var t = strokes[j];
        if (d >= t.u0 && d < t.u1) { var pt = t.el.getPointAtLength(t.L * ((d - t.u0) / t.L)); px = pt.x; py = pt.y; break; }
        if (d >= t.u1 && d < t.end && strokes[j + 1]) {
          var g = (d - t.u1) / (t.end - t.u1), n2 = strokes[j + 1];
          px = t.ex + (n2.sx - t.ex) * g; py = t.ey + (n2.sy - t.ey) * g; break;
        }
        if (d >= t.end) { px = t.ex; py = t.ey; }
      }
      pen.setAttribute('transform', 'translate(' + px.toFixed(1) + ' ' + py.toFixed(1) + ')');
      nibGlow.style.opacity = writing ? 1 : 0.35;
      lastPen = u;
    }
    var penState = { u: 0 };
    applyPen(0);

    /* ---------- measurements the slot sequence needs ---------- */
    function geo() {
      var cw = rig.offsetWidth, ch = rig.offsetHeight;
      var cx = rig.offsetLeft + cw / 2, cy = rig.offsetTop + ch / 2;
      var slitY = lip.offsetTop + lip.offsetHeight / 2;
      var s = small() ? 0.62 : 0.56;
      var aboveCy = slitY - 18 - (ch * s) / 2;
      return { cw: cw, ch: ch, cx: cx, cy: cy, slitY: slitY, s: s, dy: aboveCy - cy, slide: aboveCy - cy + ch * s + 34, H: stage.offsetHeight };
    }
    var G = geo();
    function stampPos() {
      var r = stamp.getBoundingClientRect(), f = frame.getBoundingClientRect();
      frame.style.setProperty('--fx', ((r.left + r.width / 2 - f.left) / f.width * 100).toFixed(1) + '%');
      frame.style.setProperty('--fy', ((r.top + r.height / 2 - f.top) / f.height * 100).toFixed(1) + '%');
    }

    /* ---------- HUD ---------- */
    var segs = [[0, 'Opening titles'], [0.15, 'Reel 01: Photo'], [0.385, 'Reel 02: Handwriting'], [0.485, 'Reel 03: Note'], [0.785, 'Reel 04: Address'], [0.9, 'End: Mail']];
    var lastLabel = '';
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function hud(p) {
      var label = segs[0][1];
      for (var i = 0; i < segs.length; i++) if (p >= segs[i][0]) label = segs[i][1];
      if (label !== lastLabel) { hudReel.textContent = label; lastLabel = label; }
      var fr = Math.floor(p * 90 * 24);
      hudTc.textContent = '00:' + pad(Math.floor(fr / 1440) % 60) + ':' + pad(Math.floor(fr / 24) % 60) + ':' + pad(fr % 24);
      hudLine.style.setProperty('--p', p.toFixed(4));
    }

    /* ======================================================
       MASTER TIMELINE (100 units = about 5.6 viewport heights)
       ====================================================== */
    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: reel, start: 'top top',
        end: function () { return '+=' + Math.round(window.innerHeight * (small() ? 4.7 : 5.6)); },
        pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
        onRefresh: function () { G = geo(); stampPos(); },
        onUpdate: function (self) { hud(self.progress); }
      }
    });
    var master = tl.scrollTrigger;

    /* initial states */
    gsap.set(rig, { xPercent: 7, yPercent: 4, rotation: -9, scale: 0.8 });
    gsap.set(card, { rotationY: -26, rotationX: 12 });
    gsap.set(photoInners, { filter: 'blur(5px)', scale: 1.2, rotation: -5, xPercent: -3, yPercent: 2 });
    gsap.set(stamp, { opacity: 0, scale: 2.4, yPercent: -70, rotation: 16 });
    gsap.set(stampBox, { opacity: 0 });
    gsap.set(postmark, { opacity: 0 });
    gsap.set(pen, { opacity: 0 });
    gsap.set(plate, { opacity: 0, y: 44 });
    gsap.set(lip, { opacity: 0 });

    var tIn = function (el, t) {
      tl.fromTo(el, { opacity: 0, y: 34, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 2.6, ease: 'power2.out' }, t);
    };
    var tOut = function (el, t) {
      tl.to(el, { opacity: 0, y: -28, filter: 'blur(10px)', duration: 2.2, ease: 'power2.in' }, t);
    };

    /* lamp drifts the whole way: slow parallax */
    tl.to(cone, { xPercent: -7, duration: 100 }, 0);
    tl.to(pool, { xPercent: -5, duration: 100 }, 0);
    tl.to(pool, { opacity: 1, duration: 10 }, 8);

    /* 0-16  title card dissolves, the photo drifts in from the dark */
    tl.to(tc[0], { autoAlpha: 0, y: -42, filter: 'blur(12px)', duration: 6, ease: 'power2.in' }, 4);
    tl.to(rig, { xPercent: 0, yPercent: 0, rotation: -2, scale: 1, duration: 11, ease: 'power2.out' }, 7);
    tl.to(card, { rotationY: 0, rotationX: 0, duration: 11, ease: 'power2.out' }, 7);
    tl.to(dim, { opacity: 0.08, duration: 10 }, 8);
    tl.to(photoInners, { filter: 'blur(0px)', duration: 9 }, 8);
    tIn(tc[1], 13);

    /* 17-29  pan, zoom, straighten, then crop marks lock */
    tl.fromTo(crop, { opacity: 0, scale: 1.07 }, { opacity: 1, scale: 1, duration: 2, ease: 'power2.out' }, 16.5);
    tl.to(photoInners, { scale: 1, rotation: 0, xPercent: 0, yPercent: 0, duration: 10, ease: 'power2.inOut' }, 17.5);
    tl.to(crop, { opacity: 0, duration: 1.4 }, 28.5);

    /* 29-38.5  the print: a scan bar sweeps, colour follows it */
    tl.fromTo(scan, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 29);
    tl.fromTo(layerPrint, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 9, ease: 'power1.inOut' }, 29);
    tl.fromTo(scan, { x: 0 }, { x: function () { return G.cw; }, duration: 9, ease: 'power1.inOut' }, 29);
    tl.to(scan, { opacity: 0, duration: 0.8 }, 37.8);
    tl.to(dim, { opacity: 0, duration: 4 }, 34);

    /* 37-49  title cards 1 -> 2, the card turns over */
    tOut(tc[1], 36);
    tIn(tc[2], 38.5);
    tl.to(card, { rotationY: 180, duration: 10, ease: 'power3.inOut' }, 39);
    tl.to(rig, { yPercent: -9, scale: 1.07, rotation: 0, duration: 5, ease: 'sine.out' }, 39);
    tl.to(rig, { yPercent: 0, scale: 1, duration: 5, ease: 'sine.in' }, 44);
    tl.to(shadow, { scale: 0.8, opacity: 0.45, duration: 5, ease: 'sine.out' }, 39);
    tl.to(shadow, { scale: 1, opacity: 1, duration: 5, ease: 'sine.in' }, 44);
    tl.fromTo(gloss, { opacity: 0, xPercent: -55 }, { opacity: 1, xPercent: 55, duration: 6, ease: 'power1.inOut' }, 39.5);
    tl.to(gloss, { opacity: 0, duration: 0.8 }, 45.2);

    /* 47-78  push in, the pen writes the real note */
    tOut(tc[2], 46.5);
    tIn(tc[3], 49);
    tl.to(rig, { scale: small() ? 1.12 : 1.13, xPercent: small() ? 0 : 1, duration: 4, ease: 'power2.inOut' }, 48.5);
    tl.fromTo(pen, { opacity: 0 }, { opacity: 1, duration: 1.4 }, 51.2);
    tl.to(penState, { u: 1.08, duration: 25.5, ease: 'none', onUpdate: function () { applyPen(penState.u); } }, 52);
    tl.to(rig, { x: small() ? 0 : -16, yPercent: -2, duration: 26 }, 52);
    tl.to(pen, { opacity: 0, duration: 1.4 }, 77.2);

    /* 78-89  address prints, the stamp lands with a flash, postmark follows */
    tOut(tc[3], 77.4);
    tIn(tc[4], 79.2);
    tl.fromTo(stampBox, { opacity: 0 }, { opacity: 1, duration: 1.5 }, 77);
    tl.fromTo(addrLines, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 2.2, stagger: 1.0, ease: 'none' }, 78.5);
    tl.to(rig, { scale: 1.06, x: 0, yPercent: 0, duration: 4, ease: 'power2.inOut' }, 80.5);
    tl.to(stamp, { opacity: 1, duration: 1.2 }, 82.4);
    tl.to(stamp, { scale: 1, yPercent: 0, rotation: -3, duration: 3, ease: 'power4.in' }, 82.6);
    tl.to(stamp, { scaleX: 1.08, scaleY: 0.92, duration: 0.35, ease: 'power1.out' }, 85.6);
    tl.to(stamp, { scaleX: 1, scaleY: 1, duration: 1, ease: 'elastic.out(1,0.45)' }, 85.95);
    tl.fromTo(flash, { opacity: 0 }, { opacity: 0.5, duration: 0.25, ease: 'power1.out' }, 85.6);
    tl.to(flash, { opacity: 0, duration: 2.2, ease: 'power2.out' }, 85.85);
    tl.set(ring, { scale: 0.4, opacity: 0.95 }, 85.6);
    tl.to(ring, { scale: 2.8, opacity: 0, duration: 2.4, ease: 'power2.out' }, 85.6);
    tl.to(rig, { y: 7, duration: 0.3, ease: 'power1.out' }, 85.6);
    tl.to(rig, { y: 0, duration: 1.1, ease: 'elastic.out(1,0.4)' }, 85.9);
    tl.fromTo(postmark, { opacity: 0, scale: 1.32, rotation: -26 }, { opacity: 0.88, scale: 1, rotation: -8, duration: 1.6, ease: 'power3.in' }, 87.2);
    tl.fromTo(waves, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 2, stagger: 0.25, ease: 'none' }, 87.4);

    /* 88-100  into the mail slot */
    tOut(tc[4], 88.4);
    tIn(tc[5], 91);
    tl.to(plate, { opacity: 1, y: 0, duration: 3.2, ease: 'power2.out' }, 88);
    tl.to(lip, { opacity: 1, duration: 2 }, 88.6);
    tl.to(shadow, { opacity: 0, duration: 2 }, 88.5);
    tl.to(rig, { scale: function () { return G.s; }, y: function () { return G.dy; }, xPercent: 0, duration: 5, ease: 'power2.inOut' }, 88.6);
    tl.fromTo(rigClip, { clipPath: 'inset(0px 0px 0px 0px)' }, { clipPath: function () { return 'inset(0px 0px ' + (G.H - G.slitY) + 'px 0px)'; }, duration: 0.01, ease: 'none' }, 93.7);
    tl.to(rig, { y: function () { return G.slide; }, duration: 5.6, ease: 'power2.in' }, 94.2);
    tl.to(cone, { opacity: 0.3, duration: 5 }, 94.4);
    tl.set({}, {}, 100);

    /* "See how it's made" and in-page anchors */
    function goTo(y) { gsap.to(window, { scrollTo: { y: y, autoKill: true }, duration: 1.8, ease: 'power3.inOut', overwrite: true }); }
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id === '#' || id.length < 2) return;
        if (a.hasAttribute('data-reel-link')) {
          e.preventDefault();
          goTo(master.start + (master.end - master.start) * 0.17);
          return;
        }
        var target = id === '#top' ? 0 : $(id);
        if (target === null) return;
        e.preventDefault();
        goTo(id === '#top' ? 0 : target);
        if (history.replaceState) history.replaceState(null, '', id);
      });
    });

    /* ======================================================
       CALM SECTIONS
       ====================================================== */

    /* headings: lines rise through a mask */
    $$('.split').forEach(function (h) {
      SplitText.create(h, {
        type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true,
        onSplit: function (self) {
          return gsap.from(self.lines, {
            yPercent: 115, duration: 1.5, ease: 'expo.out', stagger: 0.1,
            scrollTrigger: { trigger: h, start: 'top 88%', once: true }
          });
        }
      });
    });

    /* slow fades */
    var fades = $$('.fade');
    gsap.set(fades, { autoAlpha: 0, y: 38 });
    ScrollTrigger.batch(fades, {
      start: 'top 90%', once: true,
      onEnter: function (els) {
        gsap.to(els, { autoAlpha: 1, y: 0, duration: 1.7, ease: 'power3.out', stagger: 0.16, overwrite: true });
      }
    });

    /* handwriting: boxes find the letters, the letters collect on the right */
    var dets = $$('.det'), cells = $$('.cell'), sheet = $('.sheet');
    gsap.set(dets, { strokeDasharray: 1, strokeDashoffset: 1, fillOpacity: 0 });
    gsap.set(cells, { opacity: 0, scale: 0.78, yPercent: 12 });
    var th = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '.scope', start: 'top 72%', end: 'bottom 42%', scrub: 0.8 }
    });
    th.to(dets, { strokeDashoffset: 0, fillOpacity: 0.08, duration: 1, stagger: 0.1 }, 0)
      .to(cells, { opacity: 1, scale: 1, yPercent: 0, duration: 0.8, ease: 'power2.out', stagger: 0.1 }, 0.35);
    gsap.fromTo(sheet, { y: 34, rotation: -4 }, {
      y: -34, rotation: -1.6, ease: 'none',
      scrollTrigger: { trigger: '.scope', start: 'top bottom', end: 'bottom top', scrub: true }
    });

    /* spotlight: a radial veil whose light follows the scroll */
    $$('.spot-sec').forEach(function (sec) {
      var veil = document.createElement('div');
      veil.className = 'spot-veil';
      veil.setAttribute('aria-hidden', 'true');
      sec.appendChild(veil);
      var xs = (sec.getAttribute('data-sx') || '50,50').split(',').map(Number);
      gsap.fromTo(veil, {
        '--spot-x': xs[0] + '%',
        '--spot-y': function () { return (-window.innerHeight / 2) + 'px'; }
      }, {
        '--spot-x': xs[1] + '%',
        '--spot-y': function () { return (sec.offsetHeight + window.innerHeight / 2) + 'px'; },
        ease: 'none', immediateRender: true,
        scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true }
      });
    });

    /* closing: lamp rises, a pigeon crosses the light */
    gsap.fromTo('.cta-glow', { opacity: 0.15, yPercent: 32 }, {
      opacity: 1, yPercent: 0, ease: 'none',
      scrollTrigger: { trigger: '.cta', start: 'top 85%', end: 'center 55%', scrub: true }
    });
    gsap.fromTo('.flyer', { x: '-14vw', y: 36, rotation: -7 }, {
      x: '112vw', y: -70, rotation: 5, ease: 'none',
      scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true }
    });

    hud(0);
  }
})();
