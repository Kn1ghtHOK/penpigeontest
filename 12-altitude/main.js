/* PenPigeon / Altitude
   One scrubbed master timeline (0..T) carries the pigeon from the sender's window at dawn to the
   recipient's mailbox at night. Scroll position is mapped onto it through section anchors, so the
   page can reflow without the timeline caring. */
(function () {
  'use strict';
  var root = document.documentElement;
  if (!window.gsap || !window.ScrollTrigger) { root.classList.remove('fly'); return; }
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin, CustomEase);
  ScrollTrigger.config({ ignoreMobileResize: true });

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var T = 112;

  /* ---------- palettes: one per time of day ---------- */
  var PAL = {
    dawn:    { sky: ['#8e94cf', '#b9a6d6', '#eeb0c2', '#f8c3a6', '#fcdcae'], sun: '#ffe0a6', cloudF: '#fbd0c6', cloudM: '#f6b9b0', cloudO: 0.9, hillF: '#b09ac8', hillM: '#8a79ad', townB: '#8c7bb0', town: '#6c5f98', trees: '#3f3a72', win: '#ffd58a', ground: '#2e2a5c', glow: 0 },
    morning: { sky: ['#6f9bdc', '#93b1e2', '#c4bfe0', '#f4cfc0', '#fbe3bf'], sun: '#fff0c0', cloudF: '#fde4dc', cloudM: '#fbd5cd', cloudO: 0.9, hillF: '#a9b3d6', hillM: '#7f93bd', townB: '#7a8eb6', town: '#5a6c9c', trees: '#34467a', win: '#ffe0a0', ground: '#2b3868', glow: 0 },
    midday:  { sky: ['#4f9be0', '#6fb2ec', '#8fc5f1', '#b0d7f4', '#d2e8f7'], sun: '#fff6d0', cloudF: '#ffffff', cloudM: '#ffffff', cloudO: 0.85, hillF: '#9fc6dd', hillM: '#74a6c4', townB: '#6a92b0', town: '#4d7596', trees: '#2d5173', win: '#9db8ce', ground: '#27466a', glow: 0 },
    dusk:    { sky: ['#3c3a7d', '#62508f', '#8d5a96', '#d17a86', '#f0a07a'], sun: '#ffb070', cloudF: '#e6a0b0', cloudM: '#d27f98', cloudO: 0.9, hillF: '#8e6a9e', hillM: '#6a4c88', townB: '#6a5190', town: '#4c3a76', trees: '#2c2452', win: '#ffc66f', ground: '#241d48', glow: 0.12 },
    night:   { sky: ['#0e1330', '#141a40', '#1b2350', '#232c5e', '#2c3670'], sun: '#ffb070', cloudF: '#3a4585', cloudM: '#2b3677', cloudO: 0.55, hillF: '#242d63', hillM: '#1a2250', townB: '#1d2658', town: '#141a44', trees: '#0e1331', win: '#ffd98a', ground: '#0b0f2a', glow: 0.3 }
  };
  var STOPS = [[0, 'dawn'], [16, 'morning'], [30, 'midday'], [62, 'midday'], [82, 'dusk'], [86, 'dusk'], [98, 'night'], [T, 'night']];

  /* waypoints: [time, x, y] as viewport fractions. First and last are replaced with the real sill and mailbox. */
  var WP = [[0], [2, .18, .55], [5, .22, .43], [8, .26, .31], [12, .28, .22], [16, .30, .32], [22, .33, .22], [28, .35, .34], [32, .39, .24],
    [36, .42, .20], [40, .44, .16], [56, .45, .16], [60, .50, .22], [67, .57, .34], [72, .62, .23], [77, .67, .38], [82, .71, .25],
    [87, .75, .40], [92, .78, .27], [94, .79, .37], [98, .81, .30], [104]];

  function pchip(xs, ys) {
    var n = xs.length, h = [], d = [], m = [], i;
    for (i = 0; i < n - 1; i++) { h[i] = xs[i + 1] - xs[i]; d[i] = (ys[i + 1] - ys[i]) / h[i]; }
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) m[i] = 0;
      else { var w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
    }
    return function (x) {
      var k = 0; while (k < n - 2 && x > xs[k + 1]) k++;
      var t = (x - xs[k]) / h[k], t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[k] + (t3 - 2 * t2 + t) * h[k] * m[k] + (-2 * t3 + 3 * t2) * ys[k + 1] + (t3 - t2) * h[k] * m[k + 1];
    };
  }

  /* ---------- always-on bits: FAQ + menu ---------- */
  var qas = $$('.qa');
  qas.forEach(function (d, i) { if (i) d.open = false; });
  var toggle = $('.nav__toggle'), menu = $('#menu');
  function setMenu(open) { menu.classList.toggle('open', open); toggle.setAttribute('aria-expanded', String(open)); }
  toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });

  /* ---------- element handles ---------- */
  var frontFace = $('.card .front'), stage = $('#stage'), flyer = $('#flyer'), arrive = $('#arrive'), scaler = $('#scaler'), bank = $('#bank'), dangle = $('#dangle'),
    stringEl = $('#string'), card = $('#card'), backFace = $('#cardBack'), runStatic = $('#runStatic'), stamp = $('#stamp'),
    sun = $('#sun'), moon = $('#moon'), stars = $('#stars'), flag = $('.mailbox__flag'),
    wingN = $('.wing--near'), wingF = $('.wing--far'), legs = $('.legs'),
    strokeNow = $('#strokeNow'), hudClock = $('#hudClock'), needle = $('#hudNeedle'), rail = $('.hud__rail');
  var layers = $$('.layer'), road = $('#road');
  var L = function (k) { return $('[data-layer="' + k + '"]'); };

  function markerOffset(layer, marker) {
    var lr = layer.getBoundingClientRect(), mr = marker.getBoundingClientRect();
    return { x: mr.left + mr.width / 2 - lr.left, y: mr.top + mr.height / 2 - lr.top };
  }

  var mm, introDone = false;

  function boot() {
    mm = gsap.matchMedia();
    mm.add({ motion: '(prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)', mobile: '(max-width: 899.98px)' }, function (ctx) {
      var mobile = ctx.conditions.mobile;
      var S0 = mobile ? .52 : .9;
      var vw = window.innerWidth, vh = window.innerHeight;

      /* ----- reduced motion / fallback: a still dawn with the pigeon on the sill ----- */
      if (!ctx.conditions.motion) {
        root.classList.remove('fly');
        var street = L('street'), so = markerOffset(street, $('#sillMark'));
        var sr = stage.getBoundingClientRect();
        var sp = { x: so.x, y: street.getBoundingClientRect().top - sr.top + so.y };
        gsap.set(scaler, { scale: S0 });
        gsap.set(flyer, { x: sp.x, y: sp.y - 58 * S0 });
        gsap.set(card, { scale: .3 });
        $('.sky__band', stage);
        return;
      }

      root.classList.add('fly');

      /* ----- geometry ----- */
      var street = L('street');
      var sill = markerOffset(street, $('#sillMark')), mail = markerOffset(street, $('#mailMark'));
      var streetDx = Math.max(0, street.offsetWidth - vw);
      var S_SIG = mobile ? Math.min(.8, .86 * vw / (450 * .95)) : Math.min(1.1, .4 * vw / (450 * .95));
      var S_LAND = mobile ? .56 : .9;
      var CS0 = .3, CS_SIG = .95, CS_LAND = mobile ? .5 : .6;
      var L0 = 62, L_SIG = mobile ? 100 : 140, L_LAND = mobile ? 70 : 84;
      var sillPt = { x: street.offsetLeft + sill.x, y: street.offsetTop + sill.y - 58 * S0 };
      var mailPt = { x: street.offsetLeft - streetDx + mail.x, y: street.offsetTop + mail.y - 58 * S_LAND - 2 };

      /* ----- the flight path ----- */
      var pts = [], times = [];
      WP.forEach(function (w, i) {
        var x, y;
        if (i === 0) { x = sillPt.x; y = sillPt.y; }
        else if (i === WP.length - 1) { x = mailPt.x; y = mailPt.y; }
        else if (mobile) { x = vw * (.2 + (w[1] - .15) * .82); y = vh * (.1 + w[2] * .56); }
        else { x = vw * w[1]; y = vh * w[2]; }
        pts.push({ x: x, y: y }); times.push(w[0]);
      });
      var cum = [0];
      for (var i = 1; i < pts.length; i++) cum[i] = cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      var xs = times.map(function (t) { return t / T; }).concat([1]);
      var ys = cum.map(function (c) { return c / cum[cum.length - 1]; }).concat([1]);
      var curve = pchip(xs, ys), d = 'M0,0';
      for (var s = 1; s <= 280; s++) { var u = s / 280; d += ' L' + u.toFixed(4) + ',' + Math.min(1, curve(u)).toFixed(4); }
      var flightEase = CustomEase.create('flight' + Date.now(), d);

      /* ----- state driven by the timeline ----- */
      var fx = { open: 0, intro: 1, sway: 1 };
      gsap.set(arrive, { x: -vw * .62, y: -vh * .5 });
      gsap.set(flyer, { x: pts[0].x, y: pts[0].y, rotation: 0 });
      gsap.set(sun, { x: vw * .78, y: vh * .7 });
      gsap.set(scaler, { scale: S0 });
      gsap.set(card, { transformPerspective: 1500, scale: CS0, y: 0, rotationY: 0 });
      gsap.set(stringEl, { scaleY: L0 / 100 });
      gsap.set([wingN, wingF], { svgOrigin: '118 64' });
      gsap.set(legs, { svgOrigin: '112 112' });
      gsap.set(flag, { rotation: 78, transformOrigin: '8% 92%' });
      gsap.set(moon, { x: vw * .64, y: vh * .13, yPercent: 60 });
      gsap.set(stamp, { autoAlpha: 0 });
      strokeNow.textContent = '0';
      card.appendChild(backFace);

      var tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });

      tl.to(flyer, { motionPath: { path: pts, curviness: 1.3, autoRotate: true }, duration: T, ease: flightEase }, 0);
      tl.fromTo(fx, { open: 0 }, { open: 1, duration: 1.4, ease: 'power1.out' }, 0);
      tl.to(fx, { open: 0, duration: 2.2, ease: 'power1.inOut' }, 102.5);
      tl.to(fx, { sway: .25, duration: 3 }, 37).to(fx, { sway: 1, duration: 3 }, 56);

      /* sizes: close-up for the note, back to travelling size, then settling on the mailbox */
      tl.to(scaler, { scale: S_SIG, duration: 4, ease: 'power2.inOut' }, 36)
        .to(scaler, { scale: S0, duration: 4, ease: 'power2.inOut' }, 56)
        .to(scaler, { scale: S_LAND, duration: 6, ease: 'power2.inOut' }, 98);
      tl.to(card, { scale: CS_SIG, y: L_SIG - L0, duration: 4, ease: 'power2.inOut' }, 36)
        .to(card, { scale: CS0, y: 0, duration: 4, ease: 'power2.inOut' }, 56)
        .to(card, { scale: CS_LAND, y: L_LAND - L0, duration: 6, ease: 'power2.inOut' }, 98);
      tl.to(stringEl, { scaleY: L_SIG / 100, duration: 4, ease: 'power2.inOut' }, 36)
        .to(stringEl, { scaleY: L0 / 100, duration: 4, ease: 'power2.inOut' }, 56)
        .to(stringEl, { scaleY: L_LAND / 100, duration: 6, ease: 'power2.inOut' }, 98);
      tl.to(card, { rotationY: 180, duration: 3.5, ease: 'power2.inOut' }, 40);
      /* swap faces at the edge-on moment; belt and braces for engines that ignore backface-visibility */
      gsap.set(backFace, { autoAlpha: 0 });
      tl.set(backFace, { autoAlpha: 1 }, 41.75).set(frontFace, { autoAlpha: 0 }, 41.75);

      /* the real plotted note draws itself, one stroke at a time, at a steady pen speed */
      var paths = $$('.note > path'), lens = paths.map(function (p) { return p.getTotalLength(); });
      var total = lens.reduce(function (a, b) { return a + b; }, 0), GAP = .12, D = 7.4;
      var noteTl = gsap.timeline();
      paths.forEach(function (p, i) {
        noteTl.fromTo(p, { drawSVG: '0%' }, { drawSVG: '100%', duration: D * lens[i] / total, ease: 'none' }, i ? '>+=' + GAP : 0);
      });
      var windows = noteTl.getChildren(false, true, false).map(function (tw) { return { a: tw.startTime(), b: tw.startTime() + tw.duration() }; });
      var pen = $('.note .pen'), shown = -1;
      $('#strokeAll').textContent = String(paths.length);
      noteTl.eventCallback('onUpdate', function () {
        var now = noteTl.time(), idx = -1, done = 0;
        for (var k = 0; k < windows.length; k++) {
          if (now >= windows[k].b) done++;
          else if (now >= windows[k].a && idx < 0) idx = k;
        }
        if (idx >= 0) {
          var w = windows[idx], pt = paths[idx].getPointAtLength(lens[idx] * (now - w.a) / (w.b - w.a));
          pen.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ')');
          pen.setAttribute('opacity', '1');
        } else pen.setAttribute('opacity', '0');
        var c = Math.min(paths.length, done + (idx >= 0 ? 1 : 0));
        if (c !== shown) { shown = c; strokeNow.textContent = String(c); }
      });
      tl.add(noteTl, 43.5);

      /* the stamp lands, the postmark inks, the flag goes up */
      tl.fromTo(stamp, { autoAlpha: 0, scale: 2.8, rotation: -18, y: -80 }, { autoAlpha: 1, scale: 1, rotation: 3, y: 0, duration: 2.2, ease: 'power4.in' }, 106)
        .fromTo('.pm-ring, .pm-ring2, .pm-wave', { drawSVG: '0%' }, { drawSVG: '100%', duration: 2.2, stagger: .3 }, 108.3)
        .to(flag, { rotation: 0, duration: 2.6, ease: 'back.out(2.2)' }, 108.6);

      /* sky, light and colour */
      function paint(targets, prop, pick) {
        var els = gsap.utils.toArray(targets);
        els.forEach(function (el, idx) {
          var v0 = {}; v0[prop] = pick(PAL[STOPS[0][1]], idx); gsap.set(el, v0);
          for (var k = 1; k < STOPS.length; k++) {
            var v = {}; v[prop] = pick(PAL[STOPS[k][1]], idx); v.duration = STOPS[k][0] - STOPS[k - 1][0]; v.ease = 'none';
            tl.to(el, v, STOPS[k - 1][0]);
          }
        });
      }
      paint('.sky__band', 'fill', function (p, i) { return p.sky[i]; });
      paint('.sun i', 'backgroundColor', function (p) { return p.sun; });
      paint(L('cloudsF').querySelector('svg'), 'fill', function (p) { return p.cloudF; });
      paint(L('cloudsF').querySelector('svg'), 'opacity', function (p) { return p.cloudO; });
      paint(L('cloudsM').querySelector('svg'), 'fill', function (p) { return p.cloudM; });
      paint(L('cloudsM').querySelector('svg'), 'opacity', function (p) { return p.cloudO; });
      paint(L('hillsF').querySelector('svg'), 'fill', function (p) { return p.hillF; });
      paint(L('hillsM').querySelector('svg'), 'fill', function (p) { return p.hillM; });
      paint('.town-back', 'fill', function (p) { return p.townB; });
      paint('.town-front', 'fill', function (p) { return p.town; });
      paint('.win', 'fill', function (p) { return p.win; });
      paint('.trees', 'fill', function (p) { return p.trees; });
      paint('.glow', 'opacity', function (p) { return p.glow; });
      paint('.street__fill, .road', 'backgroundColor', function (p) { return p.ground; });
      tl.fromTo(stars, { opacity: 0 }, { opacity: 1, duration: 12 }, 90);
      tl.fromTo(moon, { opacity: 0, yPercent: 60 }, { opacity: 1, yPercent: 0, duration: 12 }, 88);
      tl.fromTo('.lampglow', { opacity: 0 }, { opacity: .26, duration: 12 }, 92);
      tl.to(sun, { motionPath: { path: [{ x: vw * .78, y: vh * .7 }, { x: vw * .62, y: vh * .36 }, { x: vw * .48, y: vh * .14 }, { x: vw * .34, y: vh * .2 }, { x: vw * .22, y: vh * .52 }, { x: vw * .14, y: vh * .86 }], curviness: 1.2 }, duration: 92 }, 0);

      /* parallax: each layer travels its own length, so nearer things move faster */
      layers.forEach(function (el) {
        var dx = Math.max(0, el.offsetWidth - vw);
        tl.fromTo(el, { x: 0 }, { x: -dx, duration: T }, 0);
      });
      tl.fromTo(road, { x: 0 }, { x: -Math.max(0, road.offsetWidth - vw), duration: T }, 0);
      tl.to({}, { duration: .01 }, T - .01);

      /* ----- scroll -> timeline time, through section anchors ----- */
      var anchors = [[0, 0], [T, 1]];
      function compute() {
        var sy = window.scrollY, h = window.innerHeight;
        var ctr = function (sel) { var r = $(sel).getBoundingClientRect(); return r.top + sy + r.height / 2 - h / 2; };
        var run = $('#run'), rt = run.getBoundingClientRect().top + sy, rh = run.offsetHeight;
        var ft = $('#closing').getBoundingClientRect().top + sy;
        var A = [[0, 0], [8, .8 * h], [16, ctr('#step-1')], [28, ctr('#step-2')], [36, rt], [60, rt + rh - h], [67, ctr('#step-4')],
          [77, ctr('#hand')], [87, ctr('#pricing')], [94, ctr('#faq')], [100, ft - .7 * h], [106, ft - .25 * h], [112, ft]];
        for (var k = 1; k < A.length; k++) if (A[k][1] < A[k - 1][1] + 2) A[k][1] = A[k - 1][1] + 2;
        anchors = A;
      }
      function mapScroll(y) {
        var A = anchors;
        if (y <= A[0][1]) return 0;
        for (var k = 1; k < A.length; k++) if (y <= A[k][1]) return A[k - 1][0] + (A[k][0] - A[k - 1][0]) * (y - A[k - 1][1]) / (A[k][1] - A[k - 1][1]);
        return T;
      }

      /* HUD */
      var HT = [0, 16, 48, 84, 112], HP = [0, .12, .4, .72, 1];
      var stops = $$('.hud__stop'), lastStage = '', lastClock = '', railLen = 1;
      function hudMetrics() { railLen = mobile ? rail.offsetWidth * .92 : rail.offsetHeight; }
      function hud(t) {
        var k = 1; while (k < HT.length - 1 && t > HT[k]) k++;
        var p = HP[k - 1] + (HP[k] - HP[k - 1]) * Math.min(1, Math.max(0, (t - HT[k - 1]) / (HT[k] - HT[k - 1])));
        if (mobile) gsap.set(needle, { x: p * railLen }); else gsap.set(needle, { y: p * railLen });
        var stage = t < 24 ? 'photo' : t < 66 ? 'pen' : t < 100 ? 'stamp' : 'mail';
        if (stage !== lastStage) { lastStage = stage; stops.forEach(function (a) { a.classList.toggle('on', a.dataset.stage === stage); }); }
        var clock = t < 12 ? 'Dawn' : t < 28 ? 'Morning' : t < 66 ? 'Midday' : t < 80 ? 'Afternoon' : t < 96 ? 'Dusk' : 'Night';
        if (clock !== lastClock) { lastClock = clock; hudClock.textContent = clock; }
      }

      /* ----- the ticker: eases toward the scroll target, flaps wings, swings the card ----- */
      var cur = 0, target = 0, prev = -1, phase = 0, air = 0, sw = 0, swv = 0;
      var setWN = gsap.quickSetter(wingN, 'rotation', 'deg'), setWNs = gsap.quickSetter(wingN, 'scaleY'), setWF = gsap.quickSetter(wingF, 'rotation', 'deg'),
        setLegs = gsap.quickSetter(legs, 'scaleY'), setBank = gsap.quickSetter(bank, 'rotation', 'deg'), setBob = gsap.quickSetter(bank, 'y', 'px'),
        setDangle = gsap.quickSetter(dangle, 'rotation', 'deg');
      function tick(time, dtms) {
        var dt = Math.min(.05, dtms / 1000);
        var dd = target - cur;
        if (Math.abs(dd) < 1e-3) cur = target; else cur += dd * (1 - Math.exp(-dt / .17));
        var spd = prev < 0 ? 0 : Math.abs(cur - prev) / Math.max(dt, .001);
        if (cur !== prev) { tl.time(Math.max(.01, cur)); prev = cur; hud(cur); }
        air += (Math.min(1, spd / 14) - air) * Math.min(1, dt * 6);
        var open = Math.max(fx.open, fx.intro);
        phase += dt * (2 + 4.2 * air) * (.35 + .65 * open);
        var s = Math.sin(phase * 6.2832);
        setWN(open * (16 + 40 * s));
        setWNs(1 - .24 * open * Math.max(0, -s));
        setWF(open * (10 + 32 * Math.sin(phase * 6.2832 - .55)));
        setLegs(1 - .82 * open);
        var rot = gsap.getProperty(flyer, 'rotation') || 0;
        setBank(-rot * (1 - .42 * open) + 1.4 * s * open);
        setBob(Math.sin(time * 2.1) * 2 * (.4 + open) - s * 3.2 * open);
        var tgt = 13 * air * open + 2.2 * Math.sin(time * 1.3) * fx.sway;
        swv += (-(sw - tgt) * 46 - swv * 5.4) * dt; sw += swv * dt;
        setDangle(-rot + sw);
      }
      gsap.ticker.add(tick);

      ScrollTrigger.create({ start: 0, end: 'max', onUpdate: function (self) { target = mapScroll(self.scroll()); } });
      function onRefresh() { compute(); hudMetrics(); target = mapScroll(window.scrollY); }
      ScrollTrigger.addEventListener('refresh', onRefresh);
      onRefresh(); cur = target; tl.time(Math.max(.01, cur)); prev = cur; hud(cur);

      /* ----- reveal language ----- */
      var h1 = $('#h1');
      var split = SplitText.create(h1, { type: 'lines', mask: 'lines', linesClass: 'ln' });
      split.masks.forEach(function (m) { m.style.paddingBottom = '.14em'; m.style.marginBottom = '-.14em'; });
      gsap.set('[data-reveal]', { opacity: 0, y: 26 });
      var cloudEls = $$('.cloud, .sign');
      cloudEls.forEach(function (c, i) { gsap.set(c, { opacity: 0, y: 70, rotation: i % 2 ? 1.8 : -1.8 }); });
      gsap.set('.qa', { opacity: 0, x: -36 });

      ScrollTrigger.batch(cloudEls, {
        start: 'top 90%', end: 'max', once: true,
        onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, rotation: 0, duration: 1.1, stagger: .14, ease: 'power3.out', overwrite: true }); }
      });
      ScrollTrigger.batch('.qa', {
        start: 'top 94%', end: 'max', once: true,
        onEnter: function (els) { gsap.to(els, { opacity: 1, x: 0, duration: .9, stagger: .09, ease: 'power3.out', overwrite: true }); }
      });
      $$('[data-split]').forEach(function (h) {
        var sp = SplitText.create(h, { type: 'words' });
        gsap.from(sp.words, { yPercent: 70, opacity: 0, stagger: .07, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 90%', once: true } });
      });
      qas.forEach(function (q) { q.addEventListener('toggle', function () { if (q.open) gsap.fromTo($('p', q), { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: .5, ease: 'power3.out' }); }); });

      function tagsOn(sel, p) { var idx = Math.min(2, Math.floor(p * 3)); $$(sel).forEach(function (li, i) { li.classList.toggle('on', i === idx && p > .02); }); }
      gsap.timeline({ scrollTrigger: { trigger: '#step-1 .cloud', start: 'top 72%', end: 'bottom 45%', scrub: .6, onUpdate: function (s) { tagsOn('.vis--photo .vis__tags li', s.progress); } } })
        .fromTo('.photo-pan', { rotation: 9, scale: 1.42, x: -24, y: 12, svgOrigin: '160 95' }, { rotation: 0, scale: 1, x: 0, y: 0, svgOrigin: '160 95', duration: 1, ease: 'power2.out' }, 0)
        .fromTo('.thirds', { opacity: 0 }, { opacity: .85, duration: .25 }, 0).to('.thirds', { opacity: 0, duration: .2 }, .8);
      ScrollTrigger.create({ trigger: '#step-2 .cloud', start: 'top 70%', end: 'bottom 45%', scrub: true, onUpdate: function (s) { tagsOn('.vis--hand .pick', s.progress); } });
      gsap.timeline({ scrollTrigger: { trigger: '#step-4 .cloud', start: 'top 70%', end: 'bottom 45%', scrub: .6, onUpdate: function (s) { tagsOn('.vis--addr .vis__tags li', s.progress); } } })
        .fromTo('.ad', { drawSVG: '0%' }, { drawSVG: '100%', stagger: .16, duration: .5 }, 0);
      var sheetChars = $$('.sheet p').map(function (p) { return SplitText.create(p, { type: 'words,chars', charsClass: 'ch' }).chars.filter(function (c) { return c.textContent.trim(); }); });
      gsap.timeline({ scrollTrigger: { trigger: '.sheets', start: 'top 82%', end: 'bottom 50%', scrub: .6 } })
        .to(sheetChars[0], { '--box': 1, stagger: .04, duration: .3 }, 0).to(sheetChars[1], { '--box': 1, stagger: .04, duration: .3 }, '>-0.3');

      /* ----- intro: the pigeon flies in and lands on the sill ----- */
      var layerEls = layers.slice();
      var intro = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: .15 });
      intro.from(stage, { opacity: 0, duration: 1 }, 0)
        .from(layerEls, { yPercent: 16, duration: 1.5, stagger: .07 }, 0)
        .from('.nav', { yPercent: -150, duration: .9 }, .2)
        .from(split.lines, { yPercent: 118, duration: 1.1, stagger: .12 }, .3)
        .to('[data-reveal]', { opacity: 1, y: 0, duration: .9, stagger: .12 }, .8)
        .to(arrive, { motionPath: { path: [{ x: -vw * .62, y: -vh * .5 }, { x: -vw * .34, y: -vh * .22 }, { x: -vw * .14, y: -vh * .34 }, { x: -vw * .04, y: -vh * .08 }, { x: 0, y: 0 }], curviness: 1.4 }, duration: 3, ease: 'power2.out' }, .3)
        .to(fx, { intro: 0, duration: 1, ease: 'power1.in' }, 2.3);
      if (introDone || window.scrollY > 60) intro.progress(1);
      introDone = true;
      window.__ppReady = true;

      return function () {
        gsap.ticker.remove(tick);
        ScrollTrigger.removeEventListener('refresh', onRefresh);
        runStatic.appendChild(backFace);
        strokeNow.textContent = '40';
        root.classList.remove('fly');
      };
    });
  }

  boot();

  var lastW = window.innerWidth, rz;
  window.addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(function () {
      if (Math.abs(window.innerWidth - lastW) < 2) return;
      lastW = window.innerWidth;
      mm.revert(); boot(); ScrollTrigger.refresh();
    }, 300);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
