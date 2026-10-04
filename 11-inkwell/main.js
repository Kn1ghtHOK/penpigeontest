/* PenPigeon, Ink Well.
   One continuous pen line runs the length of the page. Its path is generated from where the
   content actually sits (so it holds at any width), cut into slices with pressure-varied widths,
   and drawn with DrawSVG as you scroll. Pen nib follows the head of the line. */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    root.classList.remove('js-anim');
    return;
  }
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, ScrollToPlugin, CustomEase);
  CustomEase.create('wash', '.22,.61,.36,1');
  ScrollTrigger.config({ ignoreMobileResize: true });

  var main = $('#main');
  var header = $('#siteHeader');
  var nib = $('#nib');
  var noteSvg = $('#note');
  var notePaths = $$('#note path');
  var jPath = $('#note-j');
  var motionOK = matchMedia('(prefers-reduced-motion: no-preference)').matches;

  /* ================= the thread ================= */
  var thread = (function () {
    var svg = $('#thread');
    var g = $('.thread__slices', svg);
    var samples = [];   // {x,y,L,w}
    var slices = [];    // {el,i0,i1,L0,L1,st}
    var total = 0;
    var sched = { s: [], L: [] };
    var cur = 0;
    var introActive = false;
    var stamped = false;
    var onEnd = function () {};
    var onUnEnd = function () {};

    function mainBox() { return main.getBoundingClientRect(); }

    function route(W) {
      var mr = mainBox();
      var mobile = W < 760;
      var u = Math.min(1, W / 1440);
      var R = function (el) {
        var r = el.getBoundingClientRect();
        return { x: r.left - mr.left, y: r.top - mr.top, w: r.width, h: r.height, r: r.right - mr.left, b: r.bottom - mr.top,
                 cx: (r.left + r.right) / 2 - mr.left, cy: (r.top + r.bottom) / 2 - mr.top };
      };
      // last text line of a heading: left, right, baseline-ish bottom
      var lastLine = function (el) {
        var rg = document.createRange(); rg.selectNodeContents(el);
        var rs = Array.prototype.filter.call(rg.getClientRects(), function (q) { return q.width > 4 && q.height > 8; });
        var maxB = Math.max.apply(null, rs.map(function (q) { return q.bottom; }));
        var ln = rs.filter(function (q) { return q.bottom > maxB - 6; });
        return { x: Math.min.apply(null, ln.map(function (q) { return q.left; })) - mr.left,
                 r: Math.max.apply(null, ln.map(function (q) { return q.right; })) - mr.left };
      };
      var wrapBox = R($('.hero__inner'));
      var laneL = mobile ? 9 : Math.max(12, wrapBox.x - 42);
      var laneR = mobile ? W - 9 : Math.min(W - 12, wrapBox.r + 42);

      var pts = [];
      var P = function (x, y) { pts.push([x, y]); };
      var PP = function (arr) { arr.forEach(function (p) { pts.push(p); }); };

      // --- start: the tail of the J in the hero note ---
      var jl = jPath.getTotalLength();
      var m = noteSvg.getScreenCTM();
      var toPage = function (len) {
        var q = jPath.getPointAtLength(len);
        var sp = new DOMPoint(q.x, q.y).matrixTransform(m);
        return [sp.x - mr.left, sp.y - mr.top];
      };
      var j0 = toPage(jl), j1 = toPage(jl - 7);
      var tx = j0[0] - j1[0], ty = j0[1] - j1[1], tl = Math.hypot(tx, ty) || 1;
      tx /= tl; ty /= tl;
      var jx = j0[0], jy = j0[1];
      P(jx, jy);
      P(jx + tx * 26 * u, jy + ty * 26 * u);

      var hero = R($('#top'));
      var how = R($('#how-title'));
      var howLast = lastLine($('#how-title'));
      var nums = $$('.step__num').map(R);
      var hand = R($('#hand-title'));
      var slip = R($('#slip'));
      var priceN = R($('.price-n'));
      var priceT = R($('#price-title'));
      var covers = R($('.covers'));
      var plan = R($('.plan'));
      var faqT = R($('#faq-title'));
      var faqL = R($('.acc'));
      var ctaT = R($('#cta-title'));
      var sw = $('#seal').offsetWidth, sealWrapR = R($('#sealWrap'));
      var seal = { x: (mobile ? sealWrapR.x : sealWrapR.cx - sw / 2), cy: sealWrapR.cy };
      var ctaBtn = R($('.cta__copy .btn'));

      if (!mobile) {
        // hero exit: arc right, one lazy loop in the open lower right, sweep left along the foot of the hero
        P(jx + 120 * u, jy + 4 * u);
        P(jx + 210 * u, jy + 70 * u);
        PP(lasso([jx + 210 * u, jy + 70 * u], [jx + 150 * u, jy + 250 * u], [jx - 60 * u, hero.b - 70], 74 * u, 62 * u));
        P(jx - 380 * u, hero.b - 42);
        P(wrapBox.x + 300 * u, hero.b - 8);
        P(laneL + 90 * u, hero.b + 60);
        P(laneL - 4, hero.b + 160);
      } else {
        P(jx + 40, jy + 6);
        P(W - 30, jy + 60);
        PP(lasso([W - 30, jy + 60], [W - 60, hero.b - 150], [W * .55, hero.b - 30], 36, 30));
        P(W * .3, hero.b + 20);
        P(laneL + 4, hero.b + 90);
      }

      // --- underline the "how" heading ---
      var uy = how.b - 4;
      P(laneL + 2, how.y + 20);
      var ux0 = Math.max(how.x - 6, laneL + 18), ux1 = howLast.r + 10;
      P(ux0 - 6, uy - 24);
      P(ux0, uy + 2);
      var segs = Math.max(3, Math.round((ux1 - ux0) / 150));
      for (var i = 1; i <= segs; i++) {
        var t = i / segs;
        P(ux0 + (ux1 - ux0) * t, uy + 2 + Math.sin(t * Math.PI) * 5 + (i % 2 ? 1.5 : -1.5));
      }
      P(ux1 + 28, uy - 10);
      P(ux1 + 8, uy + 34);

      // --- loop around each step number, weaving down the stair ---
      var rx = function (n) { return n.w / 2 + (mobile ? 22 : 24); };
      var ry = function (n) { return n.h / 2 + (mobile ? 14 : 20); };
      var prev = [ux1 + 8, uy + 34];
      for (var k = 0; k < nums.length; k++) {
        var n = nums[k];
        var c = [n.cx, n.cy + 2];
        var next = k < nums.length - 1 ? [nums[k + 1].x - (mobile ? 6 : 34), nums[k + 1].y - 46] : [laneL + 60, n.b + 140];
        PP(lasso(prev, c, next, rx(n), ry(n)));
        prev = next;
        if (k < nums.length - 1) P(next[0], next[1]);
      }

      // --- pass the handwriting heading on the left lane, then run under the sample slip ---
      P(laneL + 30, hand.y - 20);
      P(laneL, hand.y + hand.h * .5);
      var copyB = Math.max(R($('.hand__copy')).b, slip.b) + 36;
      if (!mobile) {
        P(laneL + 6, copyB - 40);
        P(laneL + 80, copyB + 10);
        P(slip.x + slip.w * .22, copyB + 22);
        P(slip.x + slip.w * .58, copyB + 30);
        P(slip.r - 10, copyB + 14);
        P(laneR + 4, copyB + 80);
        P(laneR, priceT.y - 90);
      } else {
        P(laneL + 4, slip.b + 30);
        P(laneR - 70, slip.b + 76);
        P(laneR, priceT.y - 70);
      }

      // --- circle the price ---
      var pc = [priceN.cx, priceN.cy + priceN.h * .02];
      var priceExit = [priceN.r + (mobile ? 60 : 150), priceN.b + 40];
      PP(lasso([laneR, priceT.y - 90], pc, priceExit, priceN.w / 2 + (mobile ? 18 : 42), priceN.h * .5 + (mobile ? 12 : 22)));
      P(priceExit[0], priceExit[1]);
      if (!mobile) {
        P(laneR - 20, covers.y + 40);
        P(laneR + 2, plan.b + 70);
      } else {
        P(laneR, covers.y + 20);
        P(laneR - 2, plan.b + 50);
      }

      // --- down the margin beside the questions ---
      P(laneL + 40, faqT.y - 30);
      P(laneL + 4, faqT.y + 60);
      P(laneL + 10, faqL.y + faqL.h * .5);
      P(laneL, faqL.b + 30);

      // --- across to the seal ---
      var sx = seal.x - 26, sy = seal.cy;
      if (!mobile) {
        P(W * .3, ctaT.y - 60);
        P(W * .56, ctaT.y - 40);
        P(sx - 130 * u, sy - 110);
        P(sx - 20, sy - 46);
        P(sx + 6, sy + 12);
        P(sx - 16, sy + 30);
      } else {
        P(laneL + 30, ctaBtn.b + 40);
        P(sx - 10, sy - 40);
        P(sx + 4, sy + 10);
        P(sx - 12, sy + 28);
      }
      return pts;
    }

    // a hand-drawn loop that enters tangentially from P and leaves tangentially toward N
    function lasso(Pp, C, Nn, rx, ry) {
      var k = ry / rx, Rr = rx, TAU = Math.PI * 2;
      var p = [Pp[0] - C[0], (Pp[1] - C[1]) / k], n = [Nn[0] - C[0], (Nn[1] - C[1]) / k];
      var dP = Math.max(Math.hypot(p[0], p[1]), Rr * 1.12), dN = Math.max(Math.hypot(n[0], n[1]), Rr * 1.12);
      var bP = Math.asin(Math.min(.93, Rr / dP)), bN = Math.asin(Math.min(.93, Rr / dN));
      var alpha = Math.atan2(-p[1], -p[0]), gamma = Math.atan2(n[1], n[0]);
      var best = null;
      [1, -1].forEach(function (s) {
        var te = alpha - s * bP - s * Math.PI / 2;
        var tx = gamma + s * bN - s * Math.PI / 2;
        var d = ((tx - te) * s) % TAU; if (d < 0) d += TAU;
        var sweep = d + TAU;
        if (!best || sweep < best.sweep) best = { s: s, te: te, sweep: sweep };
      });
      var out = [], steps = Math.ceil(best.sweep / (Math.PI / 9));
      for (var i = 0; i <= steps; i++) {
        var uu = i / steps, th = best.te + best.s * best.sweep * uu, r = Rr * (.88 + .24 * uu);
        out.push([C[0] + r * Math.cos(th), C[1] + k * r * Math.sin(th)]);
      }
      return out;
    }

    // centripetal Catmull-Rom through the control points, sampled about every 3px
    function sample(pts) {
      var out = [], L = 0;
      var dist = function (a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); };
      // drop near-duplicates
      var q = [pts[0]];
      for (var i = 1; i < pts.length; i++) if (dist(pts[i], q[q.length - 1]) > 2) q.push(pts[i]);
      var ext = function (a, b) { return [2 * a[0] - b[0], 2 * a[1] - b[1]]; };
      for (var s = 0; s < q.length - 1; s++) {
        var p0 = q[s - 1] || ext(q[s], q[s + 1]), p1 = q[s], p2 = q[s + 1], p3 = q[s + 2] || ext(q[s + 1], q[s]);
        var t0 = 0, t1 = t0 + Math.sqrt(dist(p0, p1)) || .01, t2 = t1 + Math.sqrt(dist(p1, p2)) || t1 + .01, t3 = t2 + Math.sqrt(dist(p2, p3)) || t2 + .01;
        var n = Math.max(2, Math.ceil(dist(p1, p2) / 3));
        for (var k = 0; k < n; k++) {
          var tt = t1 + (t2 - t1) * (k / n);
          var pt = [0, 0];
          for (var a = 0; a < 2; a++) {
            var A1 = (t1 - tt) / (t1 - t0) * p0[a] + (tt - t0) / (t1 - t0) * p1[a];
            var A2 = (t2 - tt) / (t2 - t1) * p1[a] + (tt - t1) / (t2 - t1) * p2[a];
            var A3 = (t3 - tt) / (t3 - t2) * p2[a] + (tt - t2) / (t3 - t2) * p3[a];
            var B1 = (t2 - tt) / (t2 - t0) * A1 + (tt - t0) / (t2 - t0) * A2;
            var B2 = (t3 - tt) / (t3 - t1) * A2 + (tt - t1) / (t3 - t1) * A3;
            pt[a] = (t2 - tt) / (t2 - t1) * B1 + (tt - t1) / (t2 - t1) * B2;
          }
          out.push({ x: pt[0], y: pt[1], L: 0, w: 0 });
        }
      }
      var last = q[q.length - 1];
      out.push({ x: last[0], y: last[1], L: 0, w: 0 });
      for (var i2 = 1; i2 < out.length; i2++) { L += Math.hypot(out[i2].x - out[i2 - 1].x, out[i2].y - out[i2 - 1].y); out[i2].L = L; }
      return out;
    }

    // pressure: downstrokes press, upstrokes lift (pointed-pen shading), then smoothed
    function widths(sm) {
      var n = sm.length, raw = new Array(n), WMIN = 1.15, WMAX = 4.5;
      for (var i = 0; i < n; i++) {
        var a = sm[Math.max(0, i - 3)], b = sm[Math.min(n - 1, i + 3)];
        var dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, ty = dy / l;
        var f = Math.max(0, Math.min(1, (ty + .3) / 1.25));
        raw[i] = WMIN + (WMAX - WMIN) * Math.pow(f, 1.25);
      }
      for (var pass = 0; pass < 3; pass++) {
        var acc = new Array(n + 1); acc[0] = 0;
        for (var i2 = 0; i2 < n; i2++) acc[i2 + 1] = acc[i2] + raw[i2];
        var W = 16;
        for (var i3 = 0; i3 < n; i3++) { var lo = Math.max(0, i3 - W), hi = Math.min(n - 1, i3 + W); raw[i3] = (acc[hi + 1] - acc[lo]) / (hi - lo + 1); }
      }
      for (var i4 = 0; i4 < n; i4++) {
        var L = sm[i4].L, w = raw[i4];
        var ease = Math.min(1, L / 320); ease = ease * ease * (3 - 2 * ease);
        w = 4.3 + (w - 4.3) * ease;                               // continue the J's weight, then settle
        var rem = sm[n - 1].L - L;
        if (rem < 110) w = 1.7 + (w - 1.7) * (rem / 110);           // lift the pen at the end
        sm[i4].w = w;
      }
    }

    function cut(sm) {
      slices.forEach(function (s) { s.el.remove(); });
      slices = [];
      var frag = document.createDocumentFragment();
      var i0 = 0;
      for (var i = 1; i < sm.length; i++) {
        var long = sm[i].L - sm[i0].L >= 110, wd = Math.abs(sm[i].w - sm[i0].w) > .26;
        if (long || wd || i === sm.length - 1) {
          var d = 'M' + sm[i0].x.toFixed(1) + ' ' + sm[i0].y.toFixed(1);
          var ws = 0;
          for (var k = i0 + 1; k <= i; k++) { d += 'L' + sm[k].x.toFixed(1) + ' ' + sm[k].y.toFixed(1); ws += sm[k].w; }
          var el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          el.setAttribute('d', d);
          el.setAttribute('stroke-width', (ws / (i - i0)).toFixed(2));
          frag.appendChild(el);
          slices.push({ el: el, i0: i0, i1: i, L0: sm[i0].L, L1: sm[i].L, st: 2 });
          i0 = i;
        }
      }
      g.appendChild(frag);
    }

    function schedule() {
      var vh = window.innerHeight, refY = vh * .6, H = main.offsetHeight, maxS = Math.max(1, H - vh);
      var n = samples.length, s = new Array(n), L = new Array(n), minRate = .2;
      s[0] = 0; L[0] = 0;
      for (var i = 1; i < n; i++) {
        var dL = samples[i].L - samples[i - 1].L;
        s[i] = Math.max(s[i - 1] + minRate * dL, samples[i].y - refY);
        L[i] = samples[i].L;
      }
      var end = s[n - 1], cap = maxS * .985;
      if (end > cap) { var k = cap / end; for (var j = 0; j < n; j++) s[j] *= k; }
      for (var q = 1; q < n; q++) if (s[q] <= s[q - 1]) s[q] = s[q - 1] + .01;
      sched = { s: s, L: L };
    }

    function lenAtScroll(y) {
      var s = sched.s, L = sched.L, n = s.length;
      if (!n) return 0;
      if (y <= s[0]) return 0;
      if (y >= s[n - 1]) return total;
      var lo = 0, hi = n - 1;
      while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (s[mid] <= y) lo = mid; else hi = mid; }
      var t = (y - s[lo]) / (s[hi] - s[lo]);
      return L[lo] + (L[hi] - L[lo]) * t;
    }

    function pointAt(len) {
      var n = samples.length, lo = 0, hi = n - 1;
      if (len <= 0) return samples[0];
      if (len >= total) return samples[n - 1];
      while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (samples[mid].L <= len) lo = mid; else hi = mid; }
      var a = samples[lo], b = samples[hi], t = (len - a.L) / ((b.L - a.L) || 1);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }

    function setSlice(i, st, frac) {
      var s = slices[i];
      if (st === 0) { if (s.st !== 0) { s.el.style.visibility = 'hidden'; s.st = 0; } }
      else if (st === 2) { if (s.st !== 2) { s.el.style.visibility = 'visible'; gsap.set(s.el, { drawSVG: '0% 100%' }); s.st = 2; } }
      else { s.el.style.visibility = 'visible'; gsap.set(s.el, { drawSVG: '0% ' + (frac * 100).toFixed(2) + '%' }); s.st = 1; }
    }

    function render(len) {
      cur = len;
      var n = slices.length, lo = 0, hi = n;
      // first slice not fully drawn
      while (lo < hi) { var mid = (lo + hi) >> 1; if (slices[mid].L1 <= len) lo = mid + 1; else hi = mid; }
      var firstOpen = lo;
      for (var i = 0; i < n; i++) {
        if (i < firstOpen) { if (slices[i].st !== 2) setSlice(i, 2); }
        else if (i === firstOpen && len > slices[i].L0) setSlice(i, 1, (len - slices[i].L0) / (slices[i].L1 - slices[i].L0));
        else if (slices[i].st !== 0) setSlice(i, 0);
        else if (i > firstOpen + 1 && slices[i].st === 0) break;
      }
      if (!introActive) {
        var p = pointAt(len);
        gsap.set(nib, { x: p.x, y: p.y, autoAlpha: (len > total - 4 && stamped) ? 0 : 1 });
      }
      if (len >= total - 12 && !stamped) { stamped = true; onEnd(); }
      else if (len < total - 160 && stamped) { stamped = false; onUnEnd(); }
    }

    function build() {
      var W = main.offsetWidth, H = main.offsetHeight;
      svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var pts = route(W);
      samples = sample(pts);
      widths(samples);
      total = samples[samples.length - 1].L;
      cut(samples);
      schedule();
      window.__inkThread = { total: total, slices: slices.length, pts: pts.length };
    }

    return {
      build: build,
      render: render,
      lenAtScroll: lenAtScroll,
      pointAt: pointAt,
      get total() { return total; },
      get cur() { return cur; },
      hideAll: function () { slices.forEach(function (s, i) { setSlice(i, 0); }); cur = 0; },
      showAll: function () { slices.forEach(function (s) { s.el.style.visibility = 'visible'; s.st = 2; }); },
      setIntro: function (v) { introActive = v; },
      onEnd: function (f, f2) { onEnd = f; onUnEnd = f2; },
      reset: function () { stamped = false; }
    };
  })();

  /* ================= helpers ================= */
  function placeNibOnNote(path, prog) {
    var len = path.getTotalLength();
    var q = path.getPointAtLength(len * prog);
    var m = noteSvg.getScreenCTM();
    var sp = new DOMPoint(q.x, q.y).matrixTransform(m);
    var mr = main.getBoundingClientRect();
    gsap.set(nib, { x: sp.x - mr.left, y: sp.y - mr.top });
  }

  // anchors scroll slowly, like a hand drawing the page into place
  function wireAnchors() {
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var t = $(id);
        if (!t) return;
        e.preventDefault();
        closeMenu();
        if (motionOK) gsap.to(window, { duration: 1.4, ease: 'power2.inOut', scrollTo: { y: t, offsetY: 72 } });
        else window.scrollTo(0, t.getBoundingClientRect().top + window.scrollY - 72);
        history.replaceState(null, '', id);
      });
    });
  }

  /* ---------- menu ---------- */
  var toggle = $('.nav__toggle'), menu = $('#menu');
  function closeMenu() {
    if (!toggle || toggle.getAttribute('aria-expanded') !== 'true') return;
    toggle.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
  }
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      menu.hidden = open;
      if (!open && motionOK) gsap.fromTo(menu, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: .6, ease: 'wash' });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeMenu(); toggle.focus(); } });
  }

  /* ---------- accordion ---------- */
  var rebuildSoon = (function () {
    var t;
    return function () { clearTimeout(t); t = setTimeout(function () { thread.build(); thread.render(thread.cur); ScrollTrigger.refresh(); }, 120); };
  })();
  $$('.acc__btn').forEach(function (btn) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    var plus = $('.plus', btn);
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      var p = $('p', panel);
      if (!motionOK) {
        panel.hidden = open;
        rebuildSoon();
        return;
      }
      gsap.killTweensOf([panel, p, plus]);
      if (!open) {
        panel.hidden = false;
        gsap.fromTo(panel, { height: 0 }, { height: 'auto', duration: .8, ease: 'wash', onComplete: rebuildSoon });
        gsap.fromTo(p, { opacity: 0, filter: 'blur(8px)', y: 8 }, { opacity: 1, filter: 'blur(0px)', y: 0, duration: 1.1, ease: 'wash', delay: .1, clearProps: 'filter,transform' });
        gsap.to(plus, { rotation: 45, duration: .5, ease: 'wash' });
      } else {
        gsap.to(plus, { rotation: 0, duration: .5, ease: 'wash' });
        gsap.to(panel, { height: 0, duration: .6, ease: 'wash', onComplete: function () { panel.hidden = true; gsap.set(panel, { clearProps: 'height' }); rebuildSoon(); } });
      }
    });
  });

  /* ---------- letter boxes on the sample slip ---------- */
  function buildBoxes() {
    var svg = $('#strip'), boxes = $('.strip__boxes', svg);
    boxes.innerHTML = '';
    $$('.ltr', svg).forEach(function (l) {
      var b = l.getBBox(), pad = 3.4;
      var r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', (b.x - pad).toFixed(1)); r.setAttribute('y', (b.y - pad).toFixed(1));
      r.setAttribute('width', (b.width + pad * 2).toFixed(1)); r.setAttribute('height', (b.height + pad * 2).toFixed(1));
      r.setAttribute('rx', '1.5');
      boxes.appendChild(r);
    });
  }

  /* ================= motion branch ================= */
  var mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', function () {
    var ready = function () {
      root.classList.remove('js-anim');
      clearTimeout(window.__inkFailsafe);

      /* initial states, set before the class comes off so nothing flashes */
      var rv = $$('.rv');
      gsap.set(rv, { opacity: 0, y: 14, filter: 'blur(8px)' });
      gsap.set($$('.site-header .brand, .site-header .nav__links, .site-header .nav__end'), { opacity: 0, y: -6 });
      gsap.set(['.hero__sub', '.hero__actions', '.facts', '.hero__note'], { opacity: 0, y: 14, filter: 'blur(8px)' });
      gsap.set('.hero__title', { opacity: 1 });
      gsap.set(['.h2', '.price__title'], { opacity: 1 });
      gsap.set(notePaths, { autoAlpha: 0 });
      gsap.set($$('.sketch path:not(.guide), .sketch rect, .sketch circle'), { drawSVG: '0%' });
      gsap.set('.seal', { autoAlpha: 0 });

      var title = new SplitText('.hero__title', { type: 'lines', linesClass: 'ln' });
      gsap.set(title.lines, { opacity: 0, y: 22, filter: 'blur(14px)' });

      thread.build();
      thread.hideAll();
      buildBoxes();

      /* ---- hero intro: headline washes in, the real note writes itself behind it ---- */
      var intro = gsap.timeline({ defaults: { ease: 'wash' } });
      thread.setIntro(true);
      gsap.set(nib, { autoAlpha: 0 });
      intro.to($$('.site-header .brand, .site-header .nav__links, .site-header .nav__end'), { opacity: 1, y: 0, duration: 1.2, stagger: .12 }, .1);
      intro.to(title.lines, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.9, stagger: .4, clearProps: 'filter' }, .25);
      var t = .6;
      intro.set(nib, { autoAlpha: 1 }, t);
      notePaths.forEach(function (p) {
        var len = p.getTotalLength(), dur = Math.max(.1, len / 640);
        intro.set(p, { autoAlpha: 1 }, t);
        intro.fromTo(p, { drawSVG: '0%' }, { drawSVG: '100%', duration: dur, ease: 'none', onUpdate: function () { placeNibOnNote(p, this.progress()); } }, t);
        t += dur + .02;
      });
      gsap.set('.note__ink', { opacity: .5 });
      intro.to('.note__ink', { opacity: .24, duration: 2.6, ease: 'power1.inOut' }, t);
      intro.to(['.hero__sub', '.hero__actions', '.facts', '.hero__note'], { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.5, stagger: .22, clearProps: 'filter' }, 1.5);
      intro.call(function () {
        thread.setIntro(false);
        thread.render(thread.cur);
      }, null, t + .1);

      /* ---- the line follows the scroll; the pen lags a little behind, like a hand ---- */
      var proxy = { len: 0 };
      var go = gsap.quickTo(proxy, 'len', { duration: .9, ease: 'power3.out', onUpdate: function () { thread.render(proxy.len); } });
      var st = ScrollTrigger.create({
        trigger: main, start: 0, end: 'max',
        onUpdate: function (self) { go(thread.lenAtScroll(self.scroll())); },
        onRefresh: function (self) { proxy.len = thread.lenAtScroll(self.scroll()); thread.render(proxy.len); }
      });
      var seekIntro = ScrollTrigger.create({ start: 70, onEnter: function () { if (intro.progress() < 1) intro.progress(1); } });
      if (window.scrollY > 70) intro.progress(1);

      /* ---- seal stamps when the pen arrives ---- */
      var seal = $('#seal');
      var stampTl = gsap.timeline({ paused: true });
      stampTl.fromTo(seal, { autoAlpha: 0, scale: 1.9, rotation: -16 },
        { autoAlpha: 1, scale: 1, rotation: -6, duration: .34, ease: 'power4.in' })
        .to(seal, { scaleX: 1.045, scaleY: .96, duration: .09, ease: 'power1.out' })
        .to(seal, { scaleX: 1, scaleY: 1, duration: .7, ease: 'elastic.out(1, .45)' });
      thread.onEnd(function () { stampTl.timeScale(1).play(); }, function () { stampTl.timeScale(1.8).reverse(); });
      ScrollTrigger.create({ trigger: '#sealWrap', start: 'top 40%', onEnter: function () { if (!stampTl.isActive() && stampTl.progress() === 0) stampTl.play(); } });

      /* ---- header ---- */
      ScrollTrigger.create({ start: 24, onToggle: function (s) { header.classList.toggle('is-scrolled', s.isActive); } });

      /* ---- slow ink-wash reveals ---- */
      ScrollTrigger.batch(rv, {
        start: 'top 88%', once: true,
        onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.6, ease: 'wash', stagger: .16, clearProps: 'filter,transform' }); }
      });

      /* ---- headlines, line by line ---- */
      $$('.h2, .price__title').forEach(function (h) {
        SplitText.create(h, {
          type: 'lines', linesClass: 'ln', autoSplit: true,
          onSplit: function (self) {
            return gsap.fromTo(self.lines, { opacity: 0, y: 26, filter: 'blur(12px)' },
              { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.9, stagger: .32, ease: 'wash', clearProps: 'filter',
                scrollTrigger: { trigger: h, start: 'top 86%', once: true } });
          }
        });
      });

      /* ---- sketches draw as each step arrives ---- */
      $$('.step').forEach(function (step) {
        var parts = $$('.sketch path:not(.guide), .sketch rect, .sketch circle', step);
        gsap.to(parts, { drawSVG: '0% 100%', duration: 1.6, ease: 'power1.inOut', stagger: .1,
          scrollTrigger: { trigger: step, start: 'top 78%', once: true } });
      });
      // step 3: the wobble
      $$('.wob').forEach(function (w) {
        gsap.fromTo(w, { rotation: 0, y: 0, svgOrigin: '376 66' }, { rotation: +w.dataset.r, y: +w.dataset.y, duration: 1.8, ease: 'power2.inOut',
          scrollTrigger: { trigger: w.closest('.step'), start: 'top 70%', once: true } });
      });

      /* ---- letters found: boxes close in on each letter, scrubbed ---- */
      var rects = $$('.strip__boxes rect'), ltrs = $$('.strip .ltr');
      gsap.set(ltrs, { opacity: .28 });
      gsap.set(rects, { drawSVG: '0%' });
      var boxTl = gsap.timeline({ scrollTrigger: { trigger: '#slip', start: 'top 68%', end: 'bottom 42%', scrub: .8 } });
      rects.forEach(function (r, i) {
        boxTl.to(r, { drawSVG: '0% 100%', duration: 1, ease: 'none' }, i * .5)
             .to(ltrs[i], { opacity: 1, duration: .8, ease: 'none' }, i * .5 + .3);
      });

      ScrollTrigger.refresh();
      // pins nothing, but the page grows once the headings split and fonts settle
      return function () { root.classList.remove('js-anim'); };
    };

    var go = function () { ready(); };
    var done = false;
    var start = function () { if (!done) { done = true; go(); } };
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(start);
      setTimeout(start, 1600);
    } else start();
  });

  /* ================= reduced motion / static ================= */
  mm.add('(prefers-reduced-motion: reduce)', function () {
    root.classList.remove('js-anim');
    clearTimeout(window.__inkFailsafe);
    var go = function () {
      thread.build();
      thread.showAll();
      gsap.set(nib, { autoAlpha: 0 });
      buildBoxes();
      ScrollTrigger.create({ start: 24, onToggle: function (s) { header.classList.toggle('is-scrolled', s.isActive); } });
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
  });

  wireAnchors();

  /* rebuild the line when the layout moves under it */
  var rz;
  var rebuild = function () {
    clearTimeout(rz);
    rz = setTimeout(function () {
      thread.build();
      if (motionOK) { thread.render(thread.cur); ScrollTrigger.refresh(); } else thread.showAll();
    }, 220);
  };
  var lastW = window.innerWidth;
  window.addEventListener('resize', function () { if (window.innerWidth !== lastW) { lastW = window.innerWidth; rebuild(); } });
  window.addEventListener('load', function () { rebuild(); });

  // debug / review hook
  window.__ink = { thread: thread, drawAll: function () { thread.showAll(); }, rebuild: function () { thread.build(); } };
})();
