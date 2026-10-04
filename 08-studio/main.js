/* PenPigeon / 08 Studio Object
   One pinned stage: the card floats up, tilts, turns over, the pen writes the note,
   a stamp lands, callouts attach, and it settles beside the price.
   GSAP: ScrollTrigger (pin + scrub), DrawSVG (note + figures), SplitText (headings),
   quickTo (magnetic buttons, pointer tilt), ScrollTo, MotionPath (closing pigeon). */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- nav menu (works without GSAP) ---------- */
  var nav = $('#nav');
  var toggle = $('.nav__toggle');
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }
  toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
  });
  $$('.nav__links a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });

  if (!window.gsap || !window.ScrollTrigger) { root.classList.remove('js'); return; }
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, ScrollToPlugin, MotionPathPlugin);
  ScrollTrigger.config({ ignoreMobileResize: true });

  var started = false;
  var mm = null;
  function start() {
    if (started) return;
    started = true;
    try { init(); } catch (err) {
      if (window.console) console.error(err);
      if (mm) mm.revert();
      ScrollTrigger.getAll().forEach(function (t) { t.kill(true); });
      root.classList.remove('js');
      root.classList.add('is-ready');
    }
  }
  var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  fontsReady.then(start);
  setTimeout(start, 2200);

  function init() {
    var stage = $('.stage');
    var heroInner = $('.hero__inner');
    var obj = $('.obj');
    var lift = $('.obj__lift');
    var tilt = $('.obj__tilt');
    var float = $('.obj__float');
    var card = $('.card');
    var shadow = $('.obj__shadow');
    var stamp = $('.stamp');
    var postmark = $('.postmark');
    var cancel = $('.cancel');
    var shock = $('.shock');
    var pen = $('.note .pen');
    var notePaths = $$('.note__paths path');
    var pricingItems = $$('.pricing [data-p]');
    var objWrap = $('#object');
    var finePointer = window.matchMedia('(pointer: fine)').matches;
    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* ---- nav border once scrolled ---- */
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) { nav.classList.toggle('is-scrolled', self.scroll() > 8); }
    });

    /* ---- sheen + shade follow the card's real rotation ---- */
    var faces = [
      { el: $('.face--front'), off: 0 },
      { el: $('.face--back'), off: 180 }
    ].map(function (f) {
      f.strip = gsap.quickSetter($('.sheen i', f.el), 'xPercent');
      f.stripO = gsap.quickSetter($('.sheen i', f.el), 'opacity');
      f.shade = gsap.quickSetter($('.shade', f.el), 'opacity');
      return f;
    });
    function wrap180(a) { return ((a + 180) % 360 + 360) % 360 - 180; }
    function updateSheen() {
      var ry = gsap.getProperty(card, 'rotationY') + gsap.getProperty(tilt, 'rotationY');
      faces.forEach(function (f) {
        var t = wrap180(ry - f.off);
        var a = Math.abs(t);
        f.strip(100 - t * 2.6);
        f.stripO(Math.max(0, 1 - a / 64) * 0.95 + 0.06);
        f.shade(Math.min(1, a / 84) * 0.9);
      });
    }
    var visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { rootMargin: '120px' }).observe(stage);
    }

    /* ---- callout lines stay attached to their part of the card ---- */
    var callouts = $$('.callout').map(function (el) {
      var key = el.getAttribute('data-key');
      return {
        key: key, el: el, right: el.classList.contains('callout--r'),
        line: document.getElementById('cl-' + key), dot: document.getElementById('cd-' + key),
        anchor: $('[data-anchor="' + key + '"]'), title: $('strong', el)
      };
    });
    function updateCallouts() {
      // all reads first, then all writes (no layout thrash)
      var sr = stage.getBoundingClientRect();
      var reads = callouts.map(function (c) {
        return { a: c.anchor.getBoundingClientRect(), t: c.title.getBoundingClientRect() };
      });
      callouts.forEach(function (c, i) {
        var a = reads[i].a, t = reads[i].t;
        var ax = a.left + a.width / 2 - sr.left, ay = a.top + a.height / 2 - sr.top;
        var ex = (c.right ? t.left - 14 : t.right + 14) - sr.left;
        var ey = t.top + t.height / 2 - sr.top;
        var kx = ex + (c.right ? -56 : 56);
        c.line.setAttribute('d', 'M' + ax.toFixed(1) + ' ' + ay.toFixed(1) + ' L' + kx.toFixed(1) + ' ' + ey.toFixed(1) + ' L' + ex.toFixed(1) + ' ' + ey.toFixed(1));
        c.dot.setAttribute('cx', ax.toFixed(1)); c.dot.setAttribute('cy', ay.toFixed(1));
      });
    }
    function calloutIn(tl, key, at) {
      var c = callouts.filter(function (x) { return x.key === key; })[0];
      tl.fromTo(c.line, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out' }, at)
        .fromTo(c.dot, { scale: 0 }, { scale: 1, duration: 0.2, ease: 'back.out(2)' }, at)
        .fromTo(c.el, { autoAlpha: 0, x: c.right ? 16 : -16 }, { autoAlpha: 1, x: 0, duration: 0.4, ease: 'power2.out' }, at + 0.25);
    }
    function calloutOut(tl, key, at) {
      var c = callouts.filter(function (x) { return x.key === key; })[0];
      tl.to(c.el, { autoAlpha: 0, x: c.right ? 10 : -10, duration: 0.3, ease: 'power2.in' }, at)
        .to(c.line, { strokeDashoffset: -1, duration: 0.35, ease: 'power2.in' }, at)
        .to(c.dot, { scale: 0, duration: 0.2 }, at + 0.15);
    }

    /* ---- the pen: draws each stroke in order, tip rides the stroke ---- */
    function addInk(tl, at, D) {
      var lens = notePaths.map(function (p) { return p.getTotalLength(); });
      var total = lens.reduce(function (a, b) { return a + b; }, 0);
      var cum = [], acc = 0;
      lens.forEach(function (l) { cum.push(acc); acc += l; });
      notePaths.forEach(function (p, i) {
        tl.fromTo(p, { drawSVG: '0%' }, { drawSVG: '100%', duration: D * lens[i] / total, ease: 'none' }, at + D * cum[i] / total);
      });
      var proxy = { v: 0 }, idx = 0;
      tl.fromTo(pen, { opacity: 0 }, { opacity: 1, duration: 0.05, ease: 'none' }, at);
      tl.fromTo(proxy, { v: 0 }, {
        v: total, duration: D, ease: 'none',
        onUpdate: function () {
          while (idx > 0 && proxy.v < cum[idx]) idx--;
          while (idx < notePaths.length - 1 && proxy.v >= cum[idx + 1]) idx++;
          var pt = notePaths[idx].getPointAtLength(Math.min(lens[idx], Math.max(0, proxy.v - cum[idx])));
          pen.setAttribute('cx', pt.x.toFixed(2)); pen.setAttribute('cy', pt.y.toFixed(2));
        }
      }, at);
      tl.to(pen, { opacity: 0, duration: 0.08, ease: 'none' }, at + D);
    }

    /* ---- the stamp thunks into the corner ---- */
    function addStamp(tl, at, dip) {
      tl.fromTo(stamp, { autoAlpha: 0, scale: 2.7, rotation: -10, y: -16 }, { autoAlpha: 1, scale: 1, rotation: 0, y: 0, duration: 0.28, ease: 'power4.in' }, at);
      tl.fromTo(shock, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 0.6, scale: 0.9, duration: 0.05, ease: 'none' }, at + 0.28);
      tl.to(shock, { autoAlpha: 0, scale: 2.4, duration: 0.55, ease: 'power2.out' }, at + 0.33);
      if (dip) {
        tl.to(lift, { y: dip, duration: 0.07, ease: 'power2.out' }, at + 0.28);
        tl.to(lift, { y: 0, duration: 0.4, ease: 'elastic.out(1,0.5)' }, at + 0.35);
        tl.to(shadow, { opacity: 1, scaleX: 1.04, duration: 0.08 }, at + 0.28);
        tl.to(shadow, { opacity: 0.9, scaleX: 1, duration: 0.4 }, at + 0.36);
      }
      tl.fromTo(postmark, { autoAlpha: 0, scale: 1.3, rotation: 14 }, { autoAlpha: 1, scale: 1, rotation: -9, duration: 0.45, ease: 'power3.out' }, at + 0.5);
      tl.fromTo(cancel.querySelectorAll('path'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.5, stagger: 0.06, ease: 'none' }, at + 0.6);
    }

    /* ---- reveal vocabulary (motion only) ---- */
    function splitHeadings() {
      $$('[data-split]').forEach(function (el) {
        var isHero = el.tagName === 'H1';
        SplitText.create(el, {
          type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true,
          onSplit: function (self) {
            var vars = { yPercent: 108, duration: 1.1, ease: 'expo.out', stagger: 0.09 };
            if (isHero) vars.delay = 0.15;
            else vars.scrollTrigger = { trigger: el, start: 'top 88%' };
            return gsap.from(self.lines, vars);
          }
        });
      });
    }
    function revealItems() {
      gsap.set('[data-reveal]', { autoAlpha: 0, y: 26 });
      ScrollTrigger.batch('[data-reveal]', {
        start: 'top 90%',
        onEnter: function (els) { gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08, overwrite: true }); }
      });
    }
    function revealSteps() {
      $$('.step').forEach(function (step) {
        var tl = gsap.timeline({ scrollTrigger: { trigger: step, start: 'top 84%' } });
        tl.from($('.step__rule', step), { scaleX: 0, duration: 1.1, ease: 'expo.out' }, 0)
          .from([$('.step__n', step), $('.step__t', step), $('.step__p', step)], { autoAlpha: 0, y: 22, duration: 0.8, ease: 'expo.out', stagger: 0.08 }, 0.15)
          .from($$('path, rect', $('.fig', step)), { drawSVG: '0%', duration: 1.1, ease: 'power2.inOut', stagger: 0.07 }, 0.25);
      });
    }

    /* ---- handwriting trace: photo, letters found, ink (scrubbed, not pinned) ---- */
    function setupTrace() {
      var trace = $('.trace');
      var inkG = $('.trace__ink', trace);
      var paths = $$('path', inkG);
      var boxesG = $('.trace__boxes', trace);
      var steps = $$('.trace__steps li', trace);
      var sheet = $('.trace__sheet', trace);
      var light = $('.trace__light', trace);
      var ns = 'http://www.w3.org/2000/svg';

      var groups = [];
      paths.forEach(function (p) {
        var b = p.getBBox();
        var g = groups[groups.length - 1];
        if (g) {
          var ov = Math.min(g.x2, b.x + b.width) - Math.max(g.x1, b.x);
          var minw = Math.min(g.x2 - g.x1, b.width);
          var sameLine = Math.abs((g.y1 + g.y2) / 2 - (b.y + b.height / 2)) < 60;
          if (sameLine && ov > 0.25 * minw) {
            g.x1 = Math.min(g.x1, b.x); g.x2 = Math.max(g.x2, b.x + b.width);
            g.y1 = Math.min(g.y1, b.y); g.y2 = Math.max(g.y2, b.y + b.height);
            return;
          }
        }
        groups.push({ x1: b.x, x2: b.x + b.width, y1: b.y, y2: b.y + b.height });
      });
      var rects = groups.map(function (g) {
        var r = document.createElementNS(ns, 'rect');
        r.setAttribute('x', (g.x1 - 5).toFixed(1)); r.setAttribute('y', (g.y1 - 5).toFixed(1));
        r.setAttribute('width', (g.x2 - g.x1 + 10).toFixed(1)); r.setAttribute('height', (g.y2 - g.y1 + 10).toFixed(1));
        boxesG.appendChild(r);
        return r;
      });
      var orig = paths.map(function (p) { return parseFloat(p.getAttribute('stroke-width')) || 2; });

      var tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: trace, start: 'top 72%', end: 'bottom 48%', scrub: 0.7,
          onUpdate: function (self) {
            var n = self.progress < 0.1 ? 0 : self.progress < 0.6 ? 1 : 2;
            steps.forEach(function (li, i) { li.classList.toggle('is-on', i === n); });
          }
        }
      });
      tl.fromTo(paths, { strokeWidth: function (i) { return orig[i] * 3.4; }, stroke: '#4d5262' },
                       { strokeWidth: function (i) { return orig[i] * 1.2; }, stroke: '#1a2038', duration: 0.34 }, 0.62)
        .fromTo(inkG, { opacity: 0.8, filter: 'blur(1.4px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.3 }, 0.62)
        .fromTo(sheet, { rotation: -2.6, skewX: -2.5 }, { rotation: 0, skewX: 0, duration: 0.34 }, 0.62)
        .fromTo(light, { opacity: 1 }, { opacity: 0, duration: 0.34 }, 0.62)
        .fromTo(rects, { autoAlpha: 0, scale: 0.92, transformOrigin: '50% 50%' },
                       { autoAlpha: 1, scale: 1, duration: 0.05, stagger: { each: 0.4 / Math.max(1, rects.length) } }, 0.1)
        .to(rects, { autoAlpha: 0, duration: 0.12 }, 0.66)
        .set({}, {}, 1);
    }

    /* ---- closing pigeon flies along a path as the section scrolls in ---- */
    function setupFlight() {
      var sec = $('.close');
      gsap.to($('.close__bird'), {
        motionPath: { path: '#flight', align: '#flight', alignOrigin: [0.5, 0.5], autoRotate: true },
        ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top 85%', end: 'bottom 20%', scrub: 1 }
      });
    }

    /* ---- magnetic buttons ---- */
    function setupMagnets() {
      if (!canHover) return;
      $$('.magnet').forEach(function (m) {
        var b = $('.btn', m);
        var xTo = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3' });
        var yTo = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3' });
        m.addEventListener('pointermove', function (e) {
          var r = m.getBoundingClientRect();
          xTo((e.clientX - (r.left + r.width / 2)) * 0.38);
          yTo((e.clientY - (r.top + r.height / 2)) * 0.38);
        });
        m.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
      });
    }

    /* ---- FAQ answers ease in ---- */
    $$('.qa').forEach(function (d) {
      d.addEventListener('toggle', function () {
        var a = $('.qa__a', d);
        if (d.open) {
          if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) gsap.fromTo(a, { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'expo.out' });
          gsap.to($('.qa__icon', d), { rotation: 45, duration: 0.3, ease: 'power2.out' });
        } else {
          gsap.to($('.qa__icon', d), { rotation: 0, duration: 0.3, ease: 'power2.out' });
        }
      });
    });

    /* =====================================================
       matchMedia: pinned (desktop) / scrubbed (small) / static (reduced)
       ===================================================== */
    mm = gsap.matchMedia();
    mm.add({
      motion: '(prefers-reduced-motion: no-preference)',
      wide: '(min-width: 1000px) and (min-height: 620px)'
    }, function (ctx) {
      var motion = ctx.conditions.motion, wide = ctx.conditions.wide;
      var cleanups = [];

      /* ---------- reduced motion: everything visible, note already written ---------- */
      if (!motion) {
        root.classList.add('is-reduced');
        var showingBack = true;
        var flipBtn = $('.flip');
        function pose() {
          gsap.set(card, showingBack ? { rotationX: 6, rotationY: -184, rotationZ: -2 } : { rotationX: 8, rotationY: -18, rotationZ: -2 });
          flipBtn.textContent = showingBack ? 'Show the front' : 'Show the back';
          flipBtn.setAttribute('aria-pressed', String(!showingBack));
          updateSheen();
        }
        var onFlip = function () { showingBack = !showingBack; pose(); };
        flipBtn.addEventListener('click', onFlip);
        pose();
        root.classList.add('is-ready');
        return function () { flipBtn.removeEventListener('click', onFlip); root.classList.remove('is-reduced'); };
      }

      /* ---------- shared motion setup (stage first, then sections in page order) ---------- */
      // intro
      gsap.from([$('.hero__sub'), $('.hero__cta'), $('.hero__facts'), $('.hero__note')], { autoAlpha: 0, y: 22, duration: 1, ease: 'expo.out', stagger: 0.09, delay: 0.45 });
      gsap.from(objWrap, { autoAlpha: 0, y: -48, duration: 1.4, ease: 'expo.out', delay: 0.2 });
      gsap.from(nav, { autoAlpha: 0, y: -12, duration: 0.9, ease: 'expo.out', delay: 0.05 });

      // idle float + sheen ticker (only while the stage is on screen)
      var idle = gsap.timeline({ repeat: -1, yoyo: true, defaults: { duration: 3.4, ease: 'sine.inOut' } });
      idle.fromTo(float, { y: 0, rotationZ: -0.4 }, { y: -9, rotationZ: 0.5 }, 0);
      var tick = function () {
        if (!visible) return;
        updateSheen();
        if (wide) updateCallouts();
      };
      gsap.ticker.add(tick);
      cleanups.push(function () { gsap.ticker.remove(tick); });

      // pointer tilt (fine pointers only)
      if (finePointer) {
        var rx = gsap.quickTo(tilt, 'rotationX', { duration: 0.9, ease: 'power3' });
        var ry = gsap.quickTo(tilt, 'rotationY', { duration: 0.9, ease: 'power3' });
        var onMove = function (e) {
          ry((e.clientX / window.innerWidth - 0.5) * 9);
          rx(-(e.clientY / window.innerHeight - 0.5) * 7);
        };
        var onLeave = function () { rx(0); ry(0); };
        stage.addEventListener('pointermove', onMove);
        stage.addEventListener('pointerleave', onLeave);
        cleanups.push(function () { stage.removeEventListener('pointermove', onMove); stage.removeEventListener('pointerleave', onLeave); });
      }

      /* ---------- DESKTOP: the pinned turn ---------- */
      if (wide) {
        // viewport units as strings: GSAP resolves them to px when the tween first renders
        var vh = function (n) { return (n * 100) + 'vh'; };
        var vw = function (n) { return (n * 100) + 'vw'; };
        var TOTAL = 12.8;
        var tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: stage, start: 'top top',
            end: function () { return '+=' + Math.round(window.innerHeight * 4.6); },
            pin: true, scrub: 0.8, anticipatePin: 1
          }
        });
        var st = tl.scrollTrigger;

        // 1. hero copy leaves, card floats up to centre and tilts toward us
        tl.to(heroInner, { autoAlpha: 0, y: -34, duration: 0.8, ease: 'power2.in' }, 0);
        tl.fromTo(obj, { x: vw(0.255), y: 0, scale: 0.84 }, { x: 0, y: vh(-0.015), scale: 0.93, duration: 1.6, ease: 'power2.inOut' }, 0);
        tl.fromTo(card, { rotationX: 9, rotationY: -26, rotationZ: -4 }, { rotationX: 12, rotationY: -10, rotationZ: -1.5, duration: 1.6, ease: 'power2.inOut' }, 0);
        tl.fromTo(shadow, { opacity: 1, scaleX: 1 }, { opacity: 0.8, scaleX: 0.92, duration: 1.6, ease: 'power2.inOut' }, 0);

        // 2. colour print callout
        calloutIn(tl, 'print', 1.6);
        calloutOut(tl, 'print', 2.55);

        // 3. the turn: lift, flip to the back, grow into the back pose
        tl.to(card, { rotationX: 6, rotationY: -180, rotationZ: 0, duration: 1.8, ease: 'power2.inOut' }, 2.7);
        tl.to(lift, { y: vh(-0.06), duration: 0.9, ease: 'power2.out' }, 2.7);
        tl.to(lift, { y: 0, duration: 0.9, ease: 'power2.in' }, 3.6);
        tl.to(obj, { scale: 1, y: vh(-0.005), duration: 1.8, ease: 'power2.inOut' }, 2.7);
        tl.to(shadow, { opacity: 0.5, scaleX: 0.78, duration: 0.9, ease: 'power2.out' }, 2.7);
        tl.to(shadow, { opacity: 0.9, scaleX: 1, duration: 0.9, ease: 'power2.in' }, 3.6);

        // 4. the pen writes the note
        addInk(tl, 4.7, 3.0);
        calloutIn(tl, 'ink', 4.95);
        calloutOut(tl, 'ink', 8.25);

        // 5. stamp thunks in, postmark follows, callouts attach
        addStamp(tl, 7.7, vh(0.014));
        calloutIn(tl, 'postage', 8.75);
        calloutIn(tl, 'stamped', 9.05);
        calloutOut(tl, 'postage', 10.3);
        calloutOut(tl, 'stamped', 10.3);

        // 6. settle into a tilted pose beside the price
        tl.to(obj, { x: vw(0.245), y: 0, scale: 0.86, duration: 1.6, ease: 'power3.inOut' }, 10.5);
        tl.to(card, { rotationX: 8, rotationY: -194, rotationZ: -3.5, duration: 1.6, ease: 'power3.inOut' }, 10.5);
        tl.fromTo(pricingItems, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power2.out' }, 11.0);

        // progress hairline + hold at the end
        tl.fromTo($('.stage__progress i'), { scaleX: 0 }, { scaleX: 1, duration: TOTAL, ease: 'none' }, 0);
        tl.set({}, {}, TOTAL);

        // nav "Pricing" lands on the settled frame instead of the hero
        var goPricing = function (e) {
          e.preventDefault();
          gsap.to(window, { scrollTo: st.start + (st.end - st.start) * 0.985, duration: 1.3, ease: 'power3.inOut' });
        };
        var links = $$('a[href="#pricing"]');
        links.forEach(function (a) { a.addEventListener('click', goPricing); });
        cleanups.push(function () { links.forEach(function (a) { a.removeEventListener('click', goPricing); }); });

        updateCallouts();
        updateSheen();
      } else {
        /* ---------- SMALL SCREENS: no pin. The card turns and the note is written once, in view ---------- */
        var mtl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: objWrap, start: 'top 82%' }
        });
        mtl.fromTo(card, { rotationX: 8, rotationY: -24, rotationZ: -3 }, { rotationX: 5, rotationY: -180, rotationZ: 0, duration: 1.5, ease: 'power2.inOut' }, 0.9);
        mtl.fromTo(lift, { y: 0 }, { y: -14, duration: 0.75, ease: 'power2.out' }, 0.9);
        mtl.to(lift, { y: 0, duration: 0.75, ease: 'power2.in' }, 1.65);
        addInk(mtl, 2.6, 2.8);
        addStamp(mtl, 5.5, 6);
        // pricing block reveals like the other sections
        gsap.set(pricingItems, { autoAlpha: 0, y: 24 });
        ScrollTrigger.batch(pricingItems, {
          start: 'top 90%',
          onEnter: function (els) { gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08, overwrite: true }); }
        });
      }

      // (no `once: true` anywhere: a once-trigger that fires during another trigger's
      // refresh kills itself mid-loop and ScrollTrigger throws)
      // below the stage, in page order (ScrollTrigger wants triggers created top to bottom)
      splitHeadings();
      revealItems();
      revealSteps();
      setupTrace();
      setupFlight();
      setupMagnets();

      root.classList.add('is-ready');
      return function () { cleanups.forEach(function (fn) { fn(); }); };
    });

    // A refresh reverts scrubbed timelines to their un-rendered state; replay them to
    // their current progress so every "from" pose (card, pen strokes, trace) is in place.
    function normalize() {
      ScrollTrigger.getAll().forEach(function (t) {
        var a = t.animation;
        if (a && t.vars.scrub !== undefined && a.progress) {
          var p = Math.max(a.progress(), 0.000001); // exactly 0 skips the from-render
          a.progress(1, true).progress(p, true);
        }
      });
    }
    ScrollTrigger.addEventListener('refresh', normalize);
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    ScrollTrigger.refresh();
    normalize();
    gsap.delayedCall(0.05, normalize);
  }
})();
