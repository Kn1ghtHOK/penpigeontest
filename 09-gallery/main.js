/* PenPigeon, Gallery Wall. GSAP 3.15: ScrollTrigger (pin + scrub), SplitText, ScrollToPlugin, Flip.
   Everything is visible and finished by default; motion is added only inside matchMedia branches. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  root.classList.add('js');

  /* ---------- nav (no GSAP needed) ---------- */
  const nav = $('.nav');
  const toggle = $('.nav__toggle');
  const setMenu = (open) => {
    if (open) nav.setAttribute('data-open', ''); else nav.removeAttribute('data-open');
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setMenu(!nav.hasAttribute('data-open')));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.hasAttribute('data-open')) { setMenu(false); toggle.focus(); } });
  $$('.nav__menu a').forEach((a) => a.addEventListener('click', () => setMenu(false)));

  /* ---------- sample sheets: wrap letters so each can get a detection box ---------- */
  $$('[data-scan]').forEach((p) => {
    const txt = p.textContent;
    p.removeAttribute('aria-label');
    p.textContent = '';
    const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = txt;
    const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
    txt.split(' ').forEach((word, wi, all) => {
      const w = document.createElement('span'); w.className = 'wd';
      for (const c of word) { const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; w.appendChild(s); }
      vis.appendChild(w);
      if (wi < all.length - 1) vis.appendChild(document.createTextNode(' '));
    });
    p.append(sr, vis);
  });
  const tray = $('[data-tray]');
  if (tray) {
    const letters = tray.textContent.trim().split(/\s+/);
    tray.textContent = '';
    letters.forEach((l, i) => {
      const s = document.createElement('span'); s.className = 'tl'; s.textContent = l;
      tray.appendChild(s); if (i < letters.length - 1) tray.appendChild(document.createTextNode(' '));
    });
  }

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, SplitText, Flip);
  gsap.defaults({ ease: 'power2.out' });

  const HIDE = 'inset(100% -6% -25% -6%)';
  const SHOW = 'inset(-25% -6% -25% -6%)';
  const motionOK = () => matchMedia('(prefers-reduced-motion: no-preference)').matches;

  /* ---------- the note: 40 real plotted paths, drawn at constant pen speed ---------- */
  const note = $('#note');
  const paths = $$('path:not(.pen__barrel):not(.pen__band)', note);
  const lens = paths.map((p) => p.getTotalLength());
  const GAP = 14; // pen travel between strokes, in path-length units
  const starts = []; let acc = 0;
  lens.forEach((L) => { starts.push(acc); acc += L + GAP; });
  const TOTAL = acc - GAP;
  const startPt = paths.map((p) => p.getPointAtLength(0));
  const endPt = paths.map((p, i) => p.getPointAtLength(lens[i]));
  const lastF = paths.map(() => -1);
  const pen = $('.pen', note);
  const strokeText = $('[data-stroke-text]');
  let lastCount = -1;

  function renderNote(t) {
    const T = t * TOTAL;
    let started = 0, cur = 0;
    paths.forEach((p, i) => {
      const f = gsap.utils.clamp(0, 1, (T - starts[i]) / lens[i]);
      if (f > 0) started = i + 1;
      if (f !== lastF[i]) {
        lastF[i] = f;
        p.style.opacity = f <= 0 ? '0' : '1';
        p.style.strokeDashoffset = f >= 1 ? '0' : String(lens[i] * (1 - f));
      }
      if (T >= starts[i]) cur = i;
    });
    // pen position: on the current stroke, or travelling (lifted) to the next one
    const L = lens[cur];
    let x, y;
    if (T - starts[cur] <= L || cur === paths.length - 1) {
      const pt = paths[cur].getPointAtLength(gsap.utils.clamp(0, L, T - starts[cur]));
      x = pt.x; y = pt.y;
    } else {
      const g = (T - starts[cur] - L) / GAP, a = endPt[cur], b = startPt[cur + 1];
      x = a.x + (b.x - a.x) * g; y = a.y + (b.y - a.y) * g;
    }
    pen.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    const n = t >= 1 ? paths.length : started;
    if (n !== lastCount && strokeText) {
      lastCount = n;
      strokeText.textContent = t >= 1 ? `${paths.length} strokes` : `Stroke ${Math.max(n, 1)} of ${paths.length}`;
    }
  }
  const prepNote = () => { paths.forEach((p, i) => { p.style.strokeDasharray = lens[i]; }); lastF.fill(-1); lastCount = -1; renderNote(0); };
  const resetNote = () => { paths.forEach((p) => { p.style.cssText = ''; }); pen.removeAttribute('transform'); if (strokeText) strokeText.textContent = `${paths.length} strokes`; };

  /* ---------- room animation builders (shared by the pinned walk and the stacked version) ---------- */
  const R = $$('.room');
  const room = (i, sel) => $$(sel, R[i]);
  const archFrom = (w) => `inset(7% ${w}% 0% ${w}% round ${(100 - 2 * w) / 2}vw ${(100 - 2 * w) / 2}vw 0vw 0vw)`;
  const archTo = 'inset(0% 0% 0% 0% round 0vw 0vw 0vw 0vw)';
  const lines = (tl, i, at, each = 0.22, dur = 0.7) =>
    tl.fromTo(room(i, '.wl'), { clipPath: HIDE, y: 16 }, { clipPath: SHOW, y: 0, duration: dur, stagger: each, ease: 'power2.out' }, at);

  function addPhoto(tl, at, dur) {
    const photo = $('.photo--edit');
    const guide = $('.guide');
    const rp = { pan: $('[data-r="pan"]'), zoom: $('[data-r="zoom"]'), rot: $('[data-r="rot"]') };
    tl.fromTo(photo, { scale: 1.17, rotation: -2.8, xPercent: -3.2, yPercent: 2.6 },
      { scale: 1, rotation: 0, xPercent: 0, yPercent: 0, duration: dur, ease: 'power2.inOut',
        onUpdate() {
          rp.zoom.textContent = Math.round(gsap.getProperty(photo, 'scale') * 100) + '%';
          rp.rot.textContent = Math.abs(gsap.getProperty(photo, 'rotation')).toFixed(1) + '°';
          rp.pan.textContent = `${Math.round(gsap.getProperty(photo, 'xPercent') * 4)}, ${Math.round(gsap.getProperty(photo, 'yPercent') * 4)}`;
        } }, at);
    tl.fromTo(guide, { opacity: 0 }, { opacity: 0.85, duration: dur * 0.25, ease: 'power1.out' }, at)
      .to(guide, { opacity: 0, duration: dur * 0.3, ease: 'power1.in' }, at + dur * 0.78);
  }

  function addPen(tl, at, dur) {
    const s = [$('.state--0'), $('.state--1'), $('.state--2')];
    const proxy = { t: 0 };
    tl.set(s[0], { opacity: 1 }, 0).set(s[2], { opacity: 0 }, 0);
    tl.fromTo(pen, { opacity: 0 }, { opacity: 1, duration: 0.3 }, at - 0.1);
    tl.to(proxy, { t: 1, duration: dur, ease: 'none', onUpdate: () => renderNote(proxy.t) }, at);
    tl.to(pen, { opacity: 0, y: -10, duration: 0.45, ease: 'power2.in' }, at + dur);
    tl.to(s[0], { opacity: 0, duration: 0.35 }, at - 0.1).fromTo(s[1], { opacity: 0 }, { opacity: 1, duration: 0.35 }, at);
    tl.to(s[1], { opacity: 0, duration: 0.4 }, at + dur - 0.15).to(s[2], { opacity: 1, duration: 0.5 }, at + dur + 0.1);
  }

  function addScan(tl, at, dur) {
    const a = $$('.sheet--a .ch'), b = $$('.sheet--b .ch'), tl2 = $$('.tl', tray);
    gsap.set([a, b], { '--box': 0 });
    tl.to(a, { '--box': 0.75, duration: 0.2, stagger: { each: dur / a.length * 0.8 }, ease: 'power1.out' }, at);
    tl.to(b, { '--box': 0.75, duration: 0.2, stagger: { each: dur / b.length * 0.8 }, ease: 'power1.out' }, at + dur * 0.28);
    tl.fromTo(tl2, { opacity: 0.1 }, { opacity: 1, duration: 0.25, stagger: { each: dur * 0.6 / tl2.length }, ease: 'power1.out' }, at + dur * 0.55);
  }

  /* ---------- the walk: pinned horizontal on desktop, vertical rooms elsewhere ---------- */
  const mm = gsap.matchMedia();
  const walk = $('.walk');
  const stage = $('.walk__stage');
  const track = $('.walk__track');
  let walkST = null, walkTL = null;
  const times = { 0: 1.3, 1: 6.6, 2: 9.9, 3: 12.3 };

  mm.add({
    horizontal: '(min-width: 1024px) and (min-height: 620px) and (prefers-reduced-motion: no-preference)',
    stacked: '((max-width: 1023px) or (max-height: 619px)) and (prefers-reduced-motion: no-preference)',
  }, (ctx) => {
    const { horizontal } = ctx.conditions;
    prepNote();

    if (horizontal) {
      walk.classList.add('is-horizontal');
      const D = 13.2;
      const unit = () => window.innerHeight * 0.4;
      const inners = $$('.room__inner');
      const cones = $$('.room .light');
      const shade = $('.walk__shade');
      const hereEl = $('[data-here]');
      const planA = $$('.plan a');
      const names = ['The photo', 'The pen', 'Your handwriting', 'The price'];
      let hereIdx = -1;

      // entering from the hero: room I opens like a doorway (scrubbed, before the pin)
      gsap.fromTo(inners[0], { clipPath: archFrom(30) }, { clipPath: archTo, ease: 'power2.out', immediateRender: true,
        scrollTrigger: { trigger: walk, start: 'top 94%', end: 'top 4%', scrub: 0.8 } });

      gsap.set(room(0, '.wl'), { clipPath: HIDE, y: 16 });
      gsap.to(room(0, '.wl'), { clipPath: SHOW, y: 0, duration: 1.7, stagger: 0.24, ease: 'power3.out',
        scrollTrigger: { trigger: walk, start: 'top 60%', once: true } });

      const updateHud = () => {
        const idx = gsap.utils.clamp(0, 3, Math.round(-gsap.getProperty(track, 'xPercent') / 25));
        if (idx === hereIdx) return;
        hereIdx = idx; hereEl.textContent = names[idx];
        planA.forEach((a, j) => { a.classList.toggle('is-on', j === idx); if (j === idx) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      };
      const tl = gsap.timeline({
        defaults: { ease: 'none' }, onUpdate: updateHud,
        scrollTrigger: {
          id: 'walk', trigger: walk, start: 'top top', end: () => '+=' + Math.round(D * unit()),
          pin: stage, scrub: 1.2, anticipatePin: 1, invalidateOnRefresh: true,
        },
      });
      walkTL = tl; walkST = tl.scrollTrigger;
      gsap.set(cones.slice(1), { opacity: 0.2 });

      // room 1: the photo is straightened, panned and zoomed
      addPhoto(tl, 0.1, 1.9);

      // between rooms: dim corridor, doorway opens, light follows
      const travel = (k, at) => {
        tl.fromTo(track, { xPercent: -25 * (k - 1) }, { xPercent: -25 * k, duration: 1.0, ease: 'power2.inOut', immediateRender: false }, at);
        tl.fromTo(inners[k], { clipPath: archFrom(30) }, { clipPath: archTo, duration: 0.8, ease: 'power2.out' }, at + 0.25);
        tl.to(shade, { opacity: 1, duration: 0.5, ease: 'power1.in' }, at).to(shade, { opacity: 0, duration: 0.5, ease: 'power1.out' }, at + 0.5);
        tl.to(cones[k - 1], { opacity: 0.2, duration: 0.7 }, at + 0.1).to(cones[k], { opacity: 1, duration: 0.8 }, at + 0.3);
      };

      travel(1, 2.3);
      lines(tl, 1, 3.25, 0.2, 0.7);
      addPen(tl, 3.9, 2.7);

      travel(2, 7.0);
      lines(tl, 2, 7.95, 0.3, 0.8);
      addScan(tl, 8.5, 1.6);

      travel(3, 10.3);
      lines(tl, 3, 11.25, 0.22, 0.7);
      tl.fromTo($$('.plaque'), { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.45, ease: 'power2.out' }, 11.6);
      tl.to({}, { duration: 0.1 }, D - 0.1); // hold so the room reads before the pin releases

      // initial states for the rooms still beyond the doorway
      gsap.set(inners[1].querySelectorAll('.wl'), { clipPath: HIDE, y: 16 });
      gsap.set(inners[2].querySelectorAll('.wl'), { clipPath: HIDE, y: 16 });
      gsap.set(inners[3].querySelectorAll('.wl'), { clipPath: HIDE, y: 16 });
      gsap.set($$('.plaque'), { opacity: 0, y: 26 });

      // anchors that point into a room scroll to it
      const goRoom = (i) => {
        const y = walkST.start + (walkST.end - walkST.start) * (times[i] / D);
        gsap.to(window, { scrollTo: { y, autoKill: true }, duration: 2.4, ease: 'power3.inOut', overwrite: true });
      };
      const handler = (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        const map = { '#room-photo': 0, '#room-pen': 1, '#room-hand': 2, '#pricing': 3 };
        const h = a.getAttribute('href');
        if (h in map) { e.preventDefault(); goRoom(map[h]); }
      };
      document.addEventListener('click', handler);

      return () => {
        document.removeEventListener('click', handler);
        walk.classList.remove('is-horizontal');
        resetNote(); walkST = null; walkTL = null;
        $$('.readout dd').forEach((d, i) => { d.textContent = ['0, 0', '100%', '0.0°'][i]; });
        $$('.plan a').forEach((a) => { a.classList.remove('is-on'); a.removeAttribute('aria-current'); });
        gsap.set([...$$('.wl'), ...$$('.ch'), ...$$('.tl')], { clearProps: 'all' });
        $$('.room__inner').forEach((el) => { el.style.clipPath = ''; });
      };
    }

    /* stacked: each room has its own scrubbed moment, no pin */
    $$('.room__inner').forEach((inner) => {
      gsap.fromTo(inner, { clipPath: archFrom(12) }, { clipPath: archTo, ease: 'power2.out',
        scrollTrigger: { trigger: inner, start: 'top 94%', end: 'top 45%', scrub: 0.8 } });
    });
    $$('.room .wl').forEach((el) => gsap.set(el, { clipPath: HIDE, y: 16 }));
    ScrollTrigger.batch('.room .wl', {
      start: 'top 90%', once: true,
      onEnter: (b) => gsap.to(b, { clipPath: SHOW, y: 0, duration: 1.3, stagger: 0.18, ease: 'power3.out' }),
    });
    const scrub = (trigger, start, end) => gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger, start, end, scrub: 1 } });
    addPhoto(scrub('.room--photo .card', 'top 82%', 'bottom 38%'), 0, 1);
    addPen(scrub('.room--pen .card', 'top 78%', 'bottom 34%'), 0.2, 2);
    addScan(scrub('.sheets', 'top 72%', 'bottom 52%'), 0, 2);
    gsap.set($$('.plaque'), { opacity: 0, y: 24 });
    ScrollTrigger.batch('.plaque', { start: 'top 88%', once: true, onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 1.2, stagger: 0.3 }) });

    return () => {
      resetNote();
      $$('.readout dd').forEach((d, i) => { d.textContent = ['0, 0', '100%', '0.0°'][i]; });
      gsap.set([...$$('.wl'), ...$$('.ch'), ...$$('.tl'), ...$$('.plaque')], { clearProps: 'all' });
      $$('.room__inner').forEach((el) => { el.style.clipPath = ''; });
    };
  });

  /* ---------- hero: lights come on, the card is hung, wall text appears line by line ---------- */
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const h1 = $('.hero h1');
    gsap.set(h1, { autoAlpha: 0 });
    let first = true;
    const split = SplitText.create(h1, {
      type: 'lines', mask: 'lines', maskClass: 'mask-line', autoSplit: true,
      onSplit(self) {
        if (first) { first = false; gsap.set(h1, { autoAlpha: 1 }); }
        return gsap.from(self.lines, { yPercent: 112, duration: 1.8, stagger: 0.16, ease: 'expo.out', delay: 0.9 });
      },
    });
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.fromTo('.hero__dim', { opacity: 0.55 }, { opacity: 0, duration: 2.6, ease: 'power2.inOut' }, 0)
      .from('.hero .light', { opacity: 0, duration: 2.6, ease: 'power2.inOut' }, 0.15)
      .from('.hero .cone', { scaleX: 0.35, duration: 2.8, ease: 'expo.out' }, 0.15)
      .from('.hero .frame', { y: -18, opacity: 0, duration: 2, ease: 'power3.out' }, 0.25)
      .to('.hero .frame', { keyframes: { rotation: [0.8, -0.5, 0.3, -0.12, 0], easeEach: 'sine.inOut' }, duration: 6, transformOrigin: '50% -14%' }, 0.7)
      .from('.hero [data-in]', { y: 18, opacity: 0, duration: 1.5, stagger: 0.16, ease: 'power3.out' }, 1.5)
      .fromTo('.hero .label > *', { clipPath: HIDE, y: 14 }, { clipPath: SHOW, y: 0, duration: 1.2, stagger: 0.2, ease: 'power3.out' }, 1.9)
      .from('.hero .bird', { x: 70, y: -80, rotation: -14, opacity: 0, duration: 2, ease: 'power3.out' }, 2.1)
      .from('.facts li', { opacity: 0, y: 8, duration: 1, stagger: 0.12 }, 2.3);

    const parallax = gsap.to('.hero__art', { yPercent: -5, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    // the cone leans a little toward the visitor (fine pointers, wide screens only)
    let off = () => {};
    if (matchMedia('(pointer: fine) and (min-width: 960px)').matches) {
      const qx = gsap.quickTo('.hero .cone', 'x', { duration: 1.8, ease: 'power3.out' });
      const move = (e) => qx((e.clientX / innerWidth - 0.5) * 36);
      $('.hero').addEventListener('pointermove', move);
      off = () => $('.hero').removeEventListener('pointermove', move);
    }
    return () => { off(); split.revert(); gsap.set(h1, { clearProps: 'all' }); };
  });

  /* ---------- after the walk: questions, last room ---------- */
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const els = $$('.faq .wl, .finale .wl');
    gsap.set(els, { clipPath: HIDE, y: 16 });
    ScrollTrigger.batch(els, { start: 'top 90%', once: true,
      onEnter: (b) => gsap.to(b, { clipPath: SHOW, y: 0, duration: 1.4, stagger: 0.18, ease: 'power3.out' }) });
    const items = $$('.faq__item');
    gsap.set(items, { opacity: 0, y: 14 });
    ScrollTrigger.batch(items, { start: 'top 92%', once: true,
      onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 1.1, stagger: 0.12, ease: 'power2.out' }) });

    const f = $('.finale .frame');
    gsap.set(f, { y: -16, opacity: 0 }); gsap.set('.finale .bird', { x: 70, y: -80, rotation: -14, opacity: 0 });
    gsap.set('.finale .btn', { opacity: 0, y: 14 });
    gsap.timeline({ scrollTrigger: { trigger: '.finale', start: 'top 62%', once: true } })
      .to(f, { y: 0, opacity: 1, duration: 1.8, ease: 'power3.out' }, 0)
      .to(f, { keyframes: { rotation: [0.7, -0.4, 0.22, -0.08, 0], easeEach: 'sine.inOut' }, duration: 5, transformOrigin: '50% -10%' }, 0.3)
      .to('.finale .bird', { x: 0, y: 0, rotation: 0, opacity: 1, duration: 2, ease: 'power3.out' }, 0.9)
      .to('.finale .btn', { opacity: 1, y: 0, duration: 1.2 }, 1.6);

    return () => { gsap.set([...els, ...items, f, '.finale .bird', '.finale .btn'], { clearProps: 'all' }); };
  });

  /* ---------- FAQ accordion (Flip slides the rows below; the answer opens with a clip) ---------- */
  const faqList = $('[data-faq]');
  faqList.addEventListener('click', (e) => {
    const btn = e.target.closest('.faq__q');
    if (!btn) return;
    const open = btn.getAttribute('aria-expanded') === 'true';
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    const items = $$('.faq__item', faqList);
    const animate = motionOK();
    const state = animate ? Flip.getState(items) : null;
    $$('.faq__q', faqList).forEach((b) => {
      if (b !== btn && b.getAttribute('aria-expanded') === 'true') {
        b.setAttribute('aria-expanded', 'false'); document.getElementById(b.getAttribute('aria-controls')).hidden = true;
      }
    });
    btn.setAttribute('aria-expanded', String(!open));
    panel.hidden = open;
    if (animate) {
      Flip.from(state, { duration: 0.9, ease: 'power3.inOut', scale: false, overwrite: true });
      if (!open) gsap.fromTo(panel, { clipPath: 'inset(0 0 100% 0)', opacity: 0 }, { clipPath: 'inset(0 0 0% 0)', opacity: 1, duration: 1, ease: 'power3.out', clearProps: 'clipPath,opacity' });
    }
  });

  /* ---------- in-page anchors: slow, deliberate scroll (instant under reduced motion) ---------- */
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented) return;
    const a = e.target.closest('a[href^="#"]');
    if (!a || !motionOK()) return;
    const h = a.getAttribute('href');
    const target = h === '#top' ? 0 : document.querySelector(h);
    if (target === null) return;
    e.preventDefault();
    gsap.to(window, { scrollTo: { y: target, offsetY: h === '#top' ? 0 : 0, autoKill: true }, duration: 1.8, ease: 'power3.inOut', overwrite: true });
  });

  const refresh = () => ScrollTrigger.refresh();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  window.addEventListener('load', refresh);
})();
