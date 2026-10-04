/* PenPigeon / 01 Plotter Blueprint
   GSAP drives everything that moves: scrubbed DrawSVG for the card, SplitText lettering, ScrambleText on the title block.
   With reduced motion or no JS the page is the finished drawing: nothing here is needed to read it. */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ----- nav menu (no gsap needed) ----- */
  var toggle = $('.nav__toggle'), menu = $('#nav-menu');
  if (toggle && menu) {
    var setMenu = function (open) { toggle.setAttribute('aria-expanded', String(open)); menu.classList.toggle('is-open', open); };
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setMenu(false); toggle.focus(); } });
  }

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, SplitText, ScrambleTextPlugin);
  ScrollTrigger.config({ ignoreMobileResize: true });

  var css = function (v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); };
  var ACC = css('--accent') || '#ff8a1f', INK = css('--ink') || '#eef9ff';

  /* ----- FAQ: answer fades in (height snaps; only opacity/transform animate) ----- */
  var motionOK = window.matchMedia('(prefers-reduced-motion: no-preference)');
  $$('.note-item').forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open && motionOK.matches) gsap.fromTo($('.note-a', d), { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: .35, ease: 'power2.out' });
    });
  });

  var mm = gsap.matchMedia();
  mm.add({ motion: '(prefers-reduced-motion: no-preference)', desk: '(min-width: 900px)' }, function (ctx) {
    var motion = ctx.conditions.motion, desk = ctx.conditions.desk;
    if (motion) {
      heroIntro();
      signature(desk);
      how(desk);
      handwriting();
      pricing();
      faq();
      closing();
    }
    trackSheets(motion);
    progressRuler(motion);
  });

  /* ---------- helpers ---------- */
  function letter(el) {
    // headings are lettered in, character by character, like a plotter titling the sheet
    if (!el) return;
    var s = new SplitText(el, { type: 'chars,words' });
    gsap.from(s.chars, { autoAlpha: 0, duration: .01, stagger: .02, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  }
  function draw(tl, targets, at, dur, stag) {
    tl.fromTo(targets, { drawSVG: '0%' }, { drawSVG: '100%', duration: dur, stagger: stag || 0, ease: 'power1.inOut' }, at);
  }
  function fade(tl, targets, at, dur, stag) {
    tl.fromTo(targets, { autoAlpha: 0 }, { autoAlpha: 1, duration: dur, stagger: stag || 0, ease: 'power1.out' }, at);
  }

  /* ---------- 01 hero intro: the sheet draws itself once on load ---------- */
  function heroIntro() {
    var svg = $('.hx'); if (!svg) return;
    var q = function (s) { return $$(s, svg); };
    var split = new SplitText('.hero h1', { type: 'chars,words' });
    var tl = gsap.timeline({ delay: .1 });
    tl.from(split.chars, { autoAlpha: 0, duration: .01, stagger: .02, ease: 'none' }, 0);
    tl.from('.hero .lede, .hero .btnrow, .hero .facts, .hero .fine', { autoAlpha: 0, y: 12, duration: .6, stagger: .09, ease: 'power2.out' }, .5);
    draw(tl, q('.hx-cons .dr'), .1, .9, .08);
    draw(tl, q('.hx-back .hx-side .dr, .hx-front .hx-side .dr'), .35, .7);
    fade(tl, q('.hx-side .fd'), .6, .5);
    draw(tl, q('.hx-back .out, .hx-front .out'), .4, 1.1, .15);
    draw(tl, q('.hx-scene .dr'), .9, .9, .09);
    fade(tl, q('.hx-scene .fd'), 1.4, .6);
    draw(tl, q('.hx-struct .dr'), 1.0, .8, .05);
    fade(tl, q('.hx-struct .fd'), 1.4, .5);
    draw(tl, q('.hx-note path'), 1.35, .16, .045);
    draw(tl, q('.hx-dim .dr'), 1.7, .7, .08);
    fade(tl, q('.hx-dim .fd'), 2.1, .4, .05);
    draw(tl, q('.hx-call .dr'), 2.0, .6, .15);
    fade(tl, q('.hx-call .fd, .hx-detail'), 2.3, .4, .06);
  }

  /* ---------- 02 detail A: scrolling draws the card ---------- */
  function signature(desk) {
    var sec = $('#made'), svg = $('#sg'); if (!sec || !svg) return;
    var q = function (s) { return $$(s, svg); };
    letter($('h2', sec));
    var NX = +svg.dataset.nx, NY = +svg.dataset.ny, CX = 100, CY = 90, CWu = 960, CHu = 640;
    var paths = q('.sg-note path');
    var info = paths.map(function (p) {
      var len = p.getTotalLength();
      return { p: p, len: len, a: p.getPointAtLength(0), b: p.getPointAtLength(len) };
    });
    var C0 = 40, C1 = 93, TRAVEL = .2, totalLen = 0, totalTravel = 0;
    info.forEach(function (s, i) {
      totalLen += s.len;
      if (i) totalTravel += Math.hypot(s.a.x - info[i - 1].b.x, s.a.y - info[i - 1].b.y);
    });
    var unit = (C1 - C0) / (totalLen + TRAVEL * totalTravel), t = C0, segs = [];
    info.forEach(function (s, i) {
      if (i) {
        var pb = info[i - 1].b, d = Math.hypot(s.a.x - pb.x, s.a.y - pb.y), dt = d * TRAVEL * unit;
        if (dt > 1e-4) { segs.push({ up: true, t0: t, t1: t + dt, ax: pb.x, ay: pb.y, bx: s.a.x, by: s.a.y }); t += dt; }
      }
      var dur = s.len * unit; s.t0 = t; s.t1 = t + dur; segs.push({ up: false, i: i, t0: t, t1: t + dur }); t += dur;
    });

    var end = function () { return '+=' + Math.round(window.innerHeight * (desk ? 3.6 : 3.2)); };
    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: sec, start: 'top top', end: end, pin: true, scrub: .5, anticipatePin: 1, invalidateOnRefresh: true }
    });

    /* stage A: guide lines, rulers, dimensions */
    tl.fromTo(q('[data-st=a] .dr'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 13, stagger: { amount: 7 }, ease: 'power1.inOut' }, 0);
    tl.fromTo(q('[data-st=a] .fd'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 4, stagger: { amount: 5 } }, 12);
    tl.fromTo('.rev tr[data-rev=a] .rev__ok', { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1.5, ease: 'back.out(2)' }, 20);
    /* stage B: card outline resolves out of the construction */
    tl.fromTo(q('.sg-out'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 11, ease: 'power2.inOut' }, 21);
    tl.fromTo(q('.sg-fill'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 8 }, 28);
    tl.fromTo(q('[data-st=b] .dr'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 8, stagger: { amount: 6 }, ease: 'power1.inOut' }, 30);
    tl.fromTo(q('[data-st=b] .fd'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 3 }, 36);
    tl.to(q('.cons'), { opacity: .4, duration: 6 }, 33);
    tl.fromTo('.rev tr[data-rev=b] .rev__ok', { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1.5, ease: 'back.out(2)' }, 38.5);
    /* stage C: the pen. Each stroke is a DrawSVG tween; length sets its share of the scroll. */
    info.forEach(function (s) {
      tl.fromTo(s.p, { drawSVG: '0%', stroke: ACC }, { drawSVG: '100%', duration: s.t1 - s.t0 }, s.t0);
      tl.to(s.p, { stroke: INK, duration: 2.2, ease: 'power1.in' }, s.t1);
    });
    tl.fromTo('.rev tr[data-rev=c] .rev__ok', { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1.5, ease: 'back.out(2)' }, C1 - .5);
    /* stage D: measure the finished note */
    tl.fromTo(q('[data-st=d] .fd'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 3, stagger: .3 }, C1 + 1.5);
    tl.fromTo('.rev tr[data-rev=d] .rev__ok', { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1.5, ease: 'back.out(2)' }, C1 + 4);
    tl.fromTo('.rev tbody tr', { opacity: .45 }, { opacity: 1, duration: 3, stagger: { each: 20 }, ease: 'none' }, 0);
    tl.set({}, {}, 107);

    /* live pen position: read from the real path under the tween */
    var nibwrap = q('.sg-nibwrap')[0], nib = q('.sg-nib')[0];
    var nh = q('.nib-h')[0], nv = q('.nib-v')[0], npx = q('.nib-px')[0], npy = q('.nib-py')[0];
    var rx = $('#ro-x'), ry = $('#ro-y'), rp = $('#ro-pen'), rn = $('#ro-n');
    var lastShown = -1;
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    function place(x, y, down, idx) {
      gsap.set(nib, { x: x, y: y });
      nh.setAttribute('d', 'M60 ' + y.toFixed(1) + 'H' + x.toFixed(1));
      nv.setAttribute('d', 'M' + x.toFixed(1) + ' 46V' + y.toFixed(1));
      npx.setAttribute('d', 'M' + (x - 5).toFixed(1) + ' 40h10l-5 8z');
      npy.setAttribute('d', 'M54 ' + (y - 5).toFixed(1) + 'v10l8 -5z');
      rx.textContent = ((x - CX) / 160).toFixed(3);
      ry.textContent = ((y - CY) / 160).toFixed(3);
      rp.textContent = down ? 'DOWN' : 'UP';
      if (idx !== lastShown) { rn.textContent = pad(idx + 1); lastShown = idx; }
    }
    function update() {
      var time = tl.time();
      if (time < C0 || time >= C1 + .5) {
        gsap.set(nibwrap, { autoAlpha: 0 });
        if (time >= C1 + .5) { place(NX + info[39].b.x, NY + info[39].b.y, false, 39); rp.textContent = 'PARKED'; gsap.set(nibwrap, { autoAlpha: 0 }); }
        else { rp.textContent = 'PARKED'; rx.textContent = '0.000'; ry.textContent = '0.000'; rn.textContent = '00'; lastShown = -1; }
        return;
      }
      gsap.set(nibwrap, { autoAlpha: 1 });
      var seg = segs[0];
      for (var k = 0; k < segs.length; k++) { if (time >= segs[k].t0) seg = segs[k]; else break; }
      if (seg.up) {
        var f = (time - seg.t0) / (seg.t1 - seg.t0);
        place(NX + seg.ax + (seg.bx - seg.ax) * f, NY + seg.ay + (seg.by - seg.ay) * f, false, Math.max(0, (segs[segs.indexOf(seg) + 1] || seg).i || 0));
      } else {
        var s = info[seg.i], pr = Math.min(1, Math.max(0, (time - seg.t0) / (seg.t1 - seg.t0)));
        var pt = s.p.getPointAtLength(s.len * pr);
        place(NX + pt.x, NY + pt.y, true, seg.i);
      }
    }
    tl.eventCallback('onUpdate', update);
    update();
  }

  /* ---------- 03 how: balloons call out the drawing, one per step ---------- */
  function how(desk) {
    var sec = $('#how'); if (!sec) return;
    letter($('h2', sec));
    var svg = $(desk ? '.asm-desk' : '.asm-mob', sec); if (!svg) return;
    var q = function (s) { return $$(s, svg); };
    var tl = gsap.timeline({ paused: true });
    draw(tl, q('.asm-front .out, .asm-back .out'), 0, 1.0, .12);
    fade(tl, q('.asm-name'), .3, .4, .1);
    draw(tl, q('.asm-scene .dr'), .3, .8, .06);
    fade(tl, q('.asm-scene .fd'), .8, .5);
    var bl = q('.balloon'), leads = q('.lead');
    var T = 1.3, G = .7;
    // 1 photo controls, 2 handwriting tabs, 3 note, 4 address and stamp
    var steps = [
      function (at) { draw(tl, q('.asm-ctl .dr'), at, .7, .08); fade(tl, q('.asm-ctl .fd'), at + .3, .4, .03); },
      function (at) { draw(tl, q('.asm-tabs .dr'), at, .6, .1); fade(tl, q('.asm-tabs .fd'), at + .3, .4, .08); },
      function (at) { draw(tl, q('.asm-note path'), at, .12, .035); },
      function (at) { draw(tl, q('.asm-struct .dr'), at, .6, .05); fade(tl, q('.asm-struct .fd'), at + .3, .4); }
    ];
    bl.forEach(function (b, i) {
      var cc = $('circle', b); gsap.set(b, { svgOrigin: cc.getAttribute('cx') + ' ' + cc.getAttribute('cy') });
      var at = T + i * G;
      tl.fromTo(b, { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: .4, ease: 'back.out(2.4)' }, at);
      tl.fromTo(leads[i], { drawSVG: '0%' }, { drawSVG: '100%', duration: .5, ease: 'power1.inOut' }, at + .15);
      tl.fromTo(leads[i].nextElementSibling, { autoAlpha: 0 }, { autoAlpha: 1, duration: .2 }, at + .55);
      steps[i](at + .3);
    });
    ScrollTrigger.create({ trigger: $('.asm-fig', sec), start: 'top 78%', once: true, onEnter: function () { tl.play(); } });

    // the step under the reader lights its balloon
    var items = $$('.step', sec);
    items.forEach(function (li, i) {
      ScrollTrigger.create({
        trigger: li, start: desk ? 'top 85%' : 'top 60%', end: desk ? 'bottom top' : 'bottom 60%',
        onToggle: function (self) {
          li.classList.toggle('is-on', self.isActive);
          var c = $('.bl-c', bl[i]), t = $('.bl-t', bl[i]);
          gsap.to(c, { fill: self.isActive ? ACC : css('--ground-lo'), duration: .25 });
          gsap.to(t, { fill: self.isActive ? css('--accent-ink') : ACC, duration: .25 });
        }
      });
    });
  }

  /* ---------- 04 handwriting: boxes find the letters, cells hold them ---------- */
  function handwriting() {
    var sec = $('#handwriting'), svg = $('#hw'); if (!sec || !svg) return;
    letter($('h2', sec));
    var q = function (s) { return $$(s, svg); };
    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '#hw-fig', start: 'top 70%', end: 'bottom 55%', scrub: .6 }
    });
    draw(tl, q('.hw-sheet'), 0, 2);
    tl.fromTo(q('.hw-boxes .detbox'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.2, stagger: .35, ease: 'power1.inOut' }, 1.6);
    tl.fromTo(q('.hw-arrow'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 1 }, 6.2);
    fade(tl, q('.hw-arrowhead, .hw > .fd'), 6.9, .6, .2);
    tl.fromTo(q('.cellbox'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.2, stagger: .12 }, 7.2);
    tl.fromTo(q('.cellg'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 1, stagger: .06 }, 7.8);
    tl.fromTo(q('.hw-glyph path'), { drawSVG: '0%', stroke: ACC }, { drawSVG: '100%', duration: .9, stagger: .09 }, 8.6);
    tl.to(q('.hw-glyph path'), { stroke: INK, duration: 1.2, stagger: .09 }, 9.5);
  }

  /* ---------- 05 pricing: the table is ruled in row by row ---------- */
  function pricing() {
    var sec = $('#pricing'); if (!sec) return;
    letter($('h2', sec));
    ScrollTrigger.batch($$('.bom__row', sec), {
      start: 'top 90%', once: true,
      onEnter: function (els) {
        gsap.fromTo(els, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: .5, stagger: .09, ease: 'power2.out' });
      }
    });
    gsap.from($$('.bom caption', sec), { autoAlpha: 0, duration: .5, scrollTrigger: { trigger: '.price__grid', start: 'top 88%', once: true } });
  }

  /* ---------- 06 general notes: a revision cloud round the one that matters ---------- */
  function faq() {
    var sec = $('#faq'); if (!sec) return;
    letter($('h2', sec));
    var first = $('.note-item', sec); if (!first) return;
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'cloud'); svg.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS(NS, 'path'); svg.appendChild(path); first.appendChild(svg);
    var tag = document.createElement('span'); tag.className = 'cloud-tag'; tag.setAttribute('aria-hidden', 'true'); tag.textContent = 'A'; first.appendChild(tag);
    function cloudPath(w, h) {
      var bump = 26;
      function side(x1, y1, x2, y2) {
        var L = Math.hypot(x2 - x1, y2 - y1), n = Math.max(2, Math.round(L / bump)), dx = (x2 - x1) / n, dy = (y2 - y1) / n, r = Math.hypot(dx, dy) / 2 * 1.04, s = '';
        for (var i = 0; i < n; i++) s += 'A' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 0 1 ' + (x1 + dx * (i + 1)).toFixed(1) + ' ' + (y1 + dy * (i + 1)).toFixed(1);
        return s;
      }
      return 'M0 0' + side(0, 0, w, 0) + side(w, 0, w, h) + side(w, h, 0, h) + side(0, h, 0, 0) + 'Z';
    }
    function build() {
      var r = first.getBoundingClientRect(), w = r.width + 28, h = r.height + 24;
      svg.setAttribute('viewBox', '0 0 ' + w.toFixed(0) + ' ' + h.toFixed(0));
      path.setAttribute('d', cloudPath(w, h));
    }
    build();
    first.addEventListener('toggle', build);
    ScrollTrigger.addEventListener('refresh', build);
    gsap.fromTo(path, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.6, ease: 'power1.inOut', scrollTrigger: { trigger: first, start: 'top 80%', once: true } });
    gsap.from(tag, { autoAlpha: 0, scale: .4, duration: .4, delay: 1.2, scrollTrigger: { trigger: first, start: 'top 80%', once: true } });
    gsap.from($$('.note-item', sec).slice(1), { autoAlpha: 0, y: 12, duration: .5, stagger: .08, scrollTrigger: { trigger: '.notes__list', start: 'top 80%', once: true } });
  }

  /* ---------- 07 issue: the mark, drawn up from construction circles ---------- */
  function closing() {
    var sec = $('#make'), svg = $('#pg'); if (!sec || !svg) return;
    letter($('h2', sec));
    var q = function (s) { return $$(s, svg); };
    var tl = gsap.timeline({ scrollTrigger: { trigger: svg, start: 'top 75%', once: true } });
    draw(tl, q('.pg-cons .dr'), 0, 1.1, .12);
    tl.fromTo(q('.pg-fill'), { autoAlpha: 0 }, { autoAlpha: 1, duration: .6, ease: 'power1.out' }, 1.0);
    tl.to(q('.pg-cons'), { opacity: .45, duration: .6 }, 1.2);
    draw(tl, q('.pg-dim .dr'), 1.3, .6, .1);
    fade(tl, q('.pg-dim .fd'), 1.7, .4, .05);
    draw(tl, q('.pg-call .dr'), 1.5, .6, .15);
    fade(tl, q('.pg-call .fd'), 1.9, .4, .06);
  }

  /* ---------- sheet counter: the title block follows the reader ---------- */
  function trackSheets(animate) {
    var sheetEl = $('#tb-sheet'), titleEl = $('#tb-title');
    if (!sheetEl) return;
    var cur = null;
    function set(sec) {
      if (cur === sec) return; cur = sec;
      var n = sec.getAttribute('data-sheet') + ' / 07', t = sec.getAttribute('data-title');
      if (animate) {
        gsap.to(sheetEl, { duration: .5, scrambleText: { text: n, chars: '0123456789', speed: .6 } });
        gsap.to(titleEl, { duration: .7, scrambleText: { text: t, chars: 'upperCase', speed: .6 } });
      } else { sheetEl.textContent = n; titleEl.textContent = t; }
    }
    $$('.sheet').forEach(function (sec) {
      ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: function (s) { if (s.isActive) set(sec); } });
    });
    ScrollTrigger.create({ trigger: '.foot', start: 'top 85%', onToggle: function (s) { gsap.to('.tblock', { autoAlpha: s.isActive ? 0 : 1, duration: .25 }); } });
  }

  /* ---------- left ruler: the marker is scroll progress ---------- */
  function progressRuler(animate) {
    var mark = $('.ruler__mark'), lab = $('.ruler__mark b'), ruler = $('.ruler');
    if (!mark) return;
    ScrollTrigger.create({
      trigger: document.body, start: 'top top', end: 'bottom bottom',
      onUpdate: function (self) {
        var h = ruler.clientHeight - 14;
        gsap.set(mark, { y: self.progress * h + 6 });
        lab.textContent = Math.round(self.progress * 100);
      }
    });
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
