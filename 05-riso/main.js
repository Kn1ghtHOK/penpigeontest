/* PenPigeon, riso zine. GSAP drives everything that moves.
   Signature: ink plates come into register (hero pigeon, then the postcard photo),
   then a pen draws the note in black over the top. Pages turn between spreads with
   scrubbed clip-path wipes and halftone dots that swell as the next ink arrives. */
(() => {
  'use strict';
  if (!window.gsap) return;
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin, CustomEase);
  ScrollTrigger.config({ ignoreMobileResize: true });

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const thunk = CustomEase.create('thunk', 'M0,0 C0.5,0 0.6,0.2 0.72,0.6 0.8,0.92 0.86,1.12 0.93,1.06 0.97,1.02 1,1 1,1');

  /* ------------------------------------------------------------------
     Halftone canvases: a rotated dot lattice, dot radius follows a field
     (radial or linear) times a "grow" value that scroll drives.
  ------------------------------------------------------------------ */
  const HT = (() => {
    const css = getComputedStyle(document.documentElement);
    const inkVar = { pink: '--pink', blue: '--blue', yellow: '--yellow', black: '--ink' };
    const field = {
      radial: (x, y, w, h, c) => {
        const cx = (c.dataset.cx ? +c.dataset.cx : 0.5) * w;
        const cy = (c.dataset.cy ? +c.dataset.cy : 0.5) * h;
        const R = Math.min(w, h) * 0.5 * (c.dataset.reach ? +c.dataset.reach : 1.15);
        return Math.max(0, 1 - Math.hypot(x - cx, y - cy) / R);
      },
      up: (x, y, w, h) => y / h,
      down: (x, y, w, h) => 1 - y / h,
    };
    function size(c) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = c.clientWidth, h = c.clientHeight;
      if (!w || !h) return null;
      const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
      if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
      return { w, h, dpr };
    }
    function draw(c, grow) {
      if (grow !== undefined) c._grow = grow;
      const g = c._grow === undefined ? +(c.dataset.grow || 1) : c._grow;
      const s = size(c);
      if (!s) return;
      const ctx = c.getContext('2d');
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, s.w, s.h);
      if (g <= 0.001) return;
      const pitch = +(c.dataset.pitch || 12);
      const ang = (+(c.dataset.angle || 45)) * Math.PI / 180;
      const cos = Math.cos(ang), sin = Math.sin(ang);
      const f = field[c.dataset.field || 'radial'];
      const n = Math.ceil(Math.hypot(s.w, s.h) / pitch / 2) + 2;
      ctx.fillStyle = css.getPropertyValue(inkVar[c.dataset.ink || 'pink']).trim();
      ctx.beginPath();
      for (let a = -n; a <= n; a++) {
        for (let b = -n; b <= n; b++) {
          const u = a * pitch, v = b * pitch;
          const x = u * cos - v * sin + s.w / 2;
          const y = u * sin + v * cos + s.h / 2;
          if (x < -pitch || y < -pitch || x > s.w + pitch || y > s.h + pitch) continue;
          const val = f(x, y, s.w, s.h, c);
          if (val <= 0) continue;
          const r = pitch * 0.5 * Math.sqrt(val) * 1.18 * g;
          if (r < 0.4) continue;
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, 6.2832);
        }
      }
      ctx.fill();
    }
    return { draw, all: () => $$('canvas.ht') };
  })();

  // grow-tween helper: returns a tween that moves a canvas's dot gain
  const gain = (canvas, from, to, vars = {}) => {
    const o = { g: from };
    return gsap.fromTo(o, { g: from }, Object.assign({ g: to, ease: 'none', onUpdate: () => HT.draw(canvas, o.g) }, vars));
  };

  let rq = 0;
  const redrawAll = () => { cancelAnimationFrame(rq); rq = requestAnimationFrame(() => HT.all().forEach((c) => HT.draw(c))); };
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(redrawAll);
    HT.all().forEach((c) => ro.observe(c));
  } else window.addEventListener('resize', redrawAll);
  redrawAll();

  /* ------------------------------------------------------------------
     Misregistered ghosts on display type (pink + blue copies under the black)
  ------------------------------------------------------------------ */
  $$('.misreg, .step__no, .bignum').forEach((el) => {
    const html = el.innerHTML;
    ['pink', 'blue'].forEach((c) => {
      const g = document.createElement('span');
      g.className = 'ghost ghost--' + c;
      g.setAttribute('aria-hidden', 'true');
      g.innerHTML = html;
      el.appendChild(g);
    });
  });

  /* ------------------------------------------------------------------
     Nav menu + FAQ accordion (work with or without motion)
  ------------------------------------------------------------------ */
  const toggle = $('.nav__toggle'), menu = $('#nav-menu');
  const setMenu = (open) => { toggle.setAttribute('aria-expanded', open); menu.classList.toggle('is-open', open); };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  const motionOK = () => window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
  $$('.qa__q').forEach((btn) => {
    btn.addEventListener('click', () => {
      const qa = btn.closest('.qa');
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open);
      qa.classList.toggle('is-open', open);
      panel.hidden = !open;
      if (open && motionOK()) {
        gsap.fromTo(panel, { clipPath: 'inset(0 0 100% 0)', y: -10 }, { clipPath: 'inset(0 0 -10% 0)', y: 0, duration: 0.5, ease: 'expo.out', clearProps: 'clipPath,y', onComplete: () => ScrollTrigger.refresh() });
      } else ScrollTrigger.refresh();
    });
  });

  /* ------------------------------------------------------------------
     Page-turn wipes: a section's clip-path, scrubbed, with a hand-torn edge
  ------------------------------------------------------------------ */
  const seeded = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const jag = (seed, n = 16, amp = 7) => { const r = seeded(seed); return Array.from({ length: n + 1 }, () => (r() - 0.5) * amp); };
  const shapes = {
    right: (p, J) => { const e = -12 + p * 124; return 'polygon(0 0,' + J.map((j, i) => `${(e + j).toFixed(1)}% ${(i / (J.length - 1) * 100).toFixed(1)}%`).join(',') + ',0 100%)'; },
    left: (p, J) => { const e = 112 - p * 124; return 'polygon(100% 0,' + J.map((j, i) => `${(e + j).toFixed(1)}% ${(i / (J.length - 1) * 100).toFixed(1)}%`).join(',') + ',100% 100%)'; },
    down: (p, J) => { const e = -12 + p * 124; return 'polygon(0 0,100% 0,' + J.map((j, i) => `${((1 - i / (J.length - 1)) * 100).toFixed(1)}% ${(e + j).toFixed(1)}%`).join(',') + ')'; },
    iris: (p, J, o) => `circle(${(p * 150).toFixed(1)}% at ${o.cx}% ${o.cy}%)`,
    diag: (p) => {
      const S = -10 + p * 220;
      if (S <= 100) return `polygon(0 0,${S}% 0,0 ${S}%)`;
      return `polygon(0 0,100% 0,100% ${S - 100}%,${S - 100}% 100%,0 100%)`;
    },
  };
  function wipe(el, kind, seed, opt = {}) {
    const J = jag(seed);
    const o = Object.assign({ cx: 50, cy: 0 }, opt);
    const set = (p) => { el.style.clipPath = p >= 0.995 ? 'none' : shapes[kind](p, J, o); };
    const st = ScrollTrigger.create({
      trigger: el, start: 'top 98%', end: 'top 32%', scrub: true,
      onUpdate: (s) => set(s.progress),
      onRefresh: (s) => set(s.progress),
    });
    set(st.progress);
    return st;
  }

  // dots swell as the next ink arrives
  const seamGain = (seam) => {
    const c = $('canvas', seam);
    gsap.fromTo({ g: 0 }, { g: 0 }, {
      g: 1, ease: 'none',
      onUpdate() { HT.draw(c, this.targets()[0].g); },
      scrollTrigger: { trigger: seam, start: 'top 96%', end: 'bottom 30%', scrub: true },
    });
  };

  // ordinary reveals: play once, and if the page was jumped past them, finish at once
  const enter = (el, from, to = {}, st = {}) => gsap.fromTo(el, from, Object.assign({ ease: 'expo.out', duration: 1, clearProps: 'clipPath' }, to, {
    scrollTrigger: Object.assign({ trigger: el, start: 'top 88%', toggleActions: 'play complete none none' }, st),
  }));

  const headingIn = (h) => {
    const g = $$('.ghost', h);
    gsap.fromTo(h, { clipPath: 'inset(-14px 100% -14px -14px)' }, { clipPath: 'inset(-14px -14px -14px -14px)', duration: 0.9, ease: 'expo.out', clearProps: 'clipPath', scrollTrigger: { trigger: h, start: 'top 88%', toggleActions: 'play complete none none' } });
    gsap.fromTo(g[0], { x: -12, y: 7 }, { x: -2, y: 1.5, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 88%', toggleActions: 'play complete none none' } });
    gsap.fromTo(g[1], { x: 12, y: -7 }, { x: 2, y: -1.5, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 88%', toggleActions: 'play complete none none' } });
  };

  /* ------------------------------------------------------------------
     Everything below runs only when motion is welcome.
  ------------------------------------------------------------------ */
  const mm = gsap.matchMedia();
  mm.add({
    motion: '(prefers-reduced-motion: no-preference)',
    reduce: '(prefers-reduced-motion: reduce)',
    wide: '(min-width: 900px) and (min-height: 640px)',
  }, (ctx) => {
    const { motion, wide } = ctx.conditions;

    // handwriting boxes: split now so the reduced branch can show them finished
    const split = SplitText.create('.hw', { type: 'words,chars', wordsClass: 'w', charsClass: 'c' });

    if (!motion) {
      $$('.hw .c').forEach((c) => c.style.setProperty('--s', 1));
      $$('.seam canvas').forEach((c) => HT.draw(c, 0.9));
      HT.draw($('.hero__sun'), 1);
      return;
    }

    const seams = $$('.seam');
    const regState = $('[data-reg-state]');
    const setState = (p) => { const t = p > 0.985 ? 'In register.' : p > 0.5 ? 'Nearly in register.' : 'Off register.'; if (regState.textContent !== t) regState.textContent = t; };

    /* ---- 1. hero: plates slide into register ---- */
    const OFF = { blue: { x: -3.4, y: 2.6, r: -1.3 }, pink: { x: 3.2, y: -2.8, r: 1.5 }, yellow: { x: 1.8, y: 3.8, r: 0.9 } };
    const heroPlate = (c) => $(`.pigeon--hero .plate--${c}`);
    const sun = $('.hero__sun');

    // intro: the plates land on the sheet (px offsets here, % offsets belong to the scrub)
    gsap.from('.pigeon--hero .plate', { x: (i) => [-140, 130, 40, 0][i], y: (i) => [90, -110, 130, 0][i], scale: 1.06, opacity: 0, duration: 1.5, ease: 'expo.out', stagger: 0.12, delay: 0.1 });
    gsap.from('.hero__title', { clipPath: 'inset(-10px 100% -10px -10px)', duration: 1.1, ease: 'expo.out', clearProps: 'clipPath', delay: 0.05 });
    gsap.from('.hero__sub, .hero__actions, .facts, .hero__note', { y: 24, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.09, delay: 0.5, clearProps: 'transform,opacity' });
    gsap.from([sun, '.hero__scrap'], { opacity: 0, scale: 0.85, duration: 1.4, ease: 'expo.out', delay: 0.2 });

    const pinHero = wide || $('.hero').scrollHeight <= window.innerHeight + 8;
    const heroTl = gsap.timeline({
      scrollTrigger: pinHero
        ? { trigger: '.hero', start: 'top top', end: wide ? '+=85%' : '+=60%', pin: true, scrub: 0.6, anticipatePin: 1 }
        : { trigger: '.hero', start: 'top top', end: () => '+=' + Math.round(window.innerHeight * 0.5), scrub: 0.6 },
      onUpdate() { setState(this.progress()); },
    });
    ['blue', 'pink', 'yellow'].forEach((c) => {
      const o = OFF[c];
      heroTl.fromTo(heroPlate(c),
        { xPercent: o.x, yPercent: o.y, rotation: o.r, filter: 'blur(2.6px)' },
        { xPercent: 0, yPercent: 0, rotation: 0, filter: 'blur(0px)', ease: 'power2.inOut', duration: 1 }, 0);
    });
    heroTl
      .fromTo('.hero__title .ghost--pink', { x: -5, y: 3 }, { x: 0, y: 0, ease: 'power2.inOut', duration: 1 }, 0)
      .fromTo('.hero__title .ghost--blue', { x: 5, y: -3 }, { x: 0, y: 0, ease: 'power2.inOut', duration: 1 }, 0)
      .fromTo('.hero .mark', { '--mx': '-8px', '--my': '6px' }, { '--mx': '0px', '--my': '0px', ease: 'power2.inOut', duration: 1 }, 0)
      .fromTo('.hero__scrap', { xPercent: -5, rotation: -6 }, { xPercent: 0, rotation: -3, ease: 'power2.inOut', duration: 1 }, 0)
      .add(gain(sun, 0.55, 1, { duration: 1 }), 0);
    // by the end every plate is down; hold a beat so the register reads
    heroTl.to({}, { duration: 0.18 });

    /* ---- seam 1 + 2. the card spread ---- */
    seamGain(seams[0]);
    wipe($('.card'), 'diag', 11);

    const card = $('.card');
    card.classList.add('is-stack');
    const front = $('.postcard--front'), back = $('.postcard--back');
    const fpl = ['blue', 'pink', 'yellow'].map((c) => $(`.postcard--front .plate--${c}`));
    const spl = ['blue', 'pink', 'yellow'].map((c) => $(`.stamp .plate--${c}`));
    const paths = $$('.note > path');
    const penEl = $('.note .pen');
    const counter = $('#stroke-n');
    const lens = paths.map((p) => p.getTotalLength());
    const total = lens.reduce((a, b) => a + b, 0);
    const cum = []; lens.reduce((a, l, i) => (cum[i] = a, a + l), 0);
    const capEls = { front: $('.cap--front'), back: $('.cap--back'), stamp: $('.cap--stamp') };
    const pr = { p: 0 };
    let lastN = -1;
    const placePen = () => {
      const d = pr.p * total;
      let i = cum.findIndex((c, k) => d >= c && (k === cum.length - 1 || d < cum[k + 1]));
      if (i < 0) i = 0;
      const pt = paths[i].getPointAtLength(Math.min(lens[i], Math.max(0, d - cum[i])));
      penEl.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
      const n = pr.p <= 0 ? 0 : i + 1;
      if (n !== lastN) { lastN = n; counter.textContent = n; }
    };

    gsap.set([capEls.back, capEls.stamp], { opacity: 0, y: 14 });
    gsap.set('.stamp, .postmark', { opacity: 0 });
    gsap.set(penEl, { opacity: 0 });
    counter.textContent = 0;

    const cardTl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: { trigger: '.card .stage', start: 'top top', end: wide ? '+=260%' : '+=220%', pin: true, scrub: 0.6, anticipatePin: 1 },
    });
    // front: three plates register on the photo
    const FO = [{ x: -5.5, y: 4, r: -1.8 }, { x: 5, y: -4.5, r: 2 }, { x: 2.5, y: 5.5, r: 1.2 }];
    fpl.forEach((p, i) => cardTl.fromTo(p, { xPercent: FO[i].x, yPercent: FO[i].y, rotation: FO[i].r, filter: 'blur(7px)' }, { xPercent: 0, yPercent: 0, rotation: 0, filter: 'blur(0px)', duration: 1.3 }, 0));
    cardTl.fromTo(front, { rotation: -4, y: 40 }, { rotation: -1.2, y: 0, duration: 1.3 }, 0);
    cardTl.fromTo(back, { rotation: 2, y: 20 }, { rotation: 1.2, y: 0, duration: 1.3 }, 0);
    // turn: the front slides off, the back is there under it
    cardTl.to(front, { xPercent: -30, yPercent: -175, rotation: -14, duration: 0.95, ease: 'power2.in' }, 1.75);
    cardTl.to(back, { rotation: -0.8, duration: 0.9 }, 1.75);
    cardTl.to(capEls.front, { opacity: 0, y: -14, duration: 0.4 }, 1.75);
    cardTl.to(capEls.back, { opacity: 1, y: 0, duration: 0.5 }, 2.45);
    // pen: DrawSVG stroke by stroke, nib follows the tip
    cardTl.fromTo(penEl, { opacity: 0 }, { opacity: 1, duration: 0.15 }, 2.7);
    let t = 2.8;
    const D = 3.2;
    paths.forEach((p, i) => {
      const d = D * lens[i] / total;
      cardTl.fromTo(p, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: d, ease: 'none' }, t);
      t += d;
    });
    cardTl.fromTo(pr, { p: 0 }, { p: 1, duration: D, ease: 'none', onUpdate: placePen }, 2.8);
    cardTl.to(penEl, { opacity: 0, duration: 0.2 }, t + 0.05);
    // stamp: thunk, postmark
    const ts = t + 0.3;
    cardTl.to(capEls.back, { opacity: 0, y: -14, duration: 0.4 }, ts - 0.1);
    cardTl.to(capEls.stamp, { opacity: 1, y: 0, duration: 0.5 }, ts + 0.15);
    cardTl.fromTo('.stamp', { opacity: 0, scale: 2, rotation: 14 }, { opacity: 1, scale: 1, rotation: -3, duration: 0.45, ease: thunk }, ts);
    spl.forEach((p, i) => cardTl.fromTo(p, { xPercent: [-6, 6, 3][i], yPercent: [4, -5, 6][i] }, { xPercent: 0, yPercent: 0, duration: 0.5 }, ts + 0.1));
    cardTl.fromTo('.postmark', { opacity: 0, scale: 1.6, rotation: -42 }, { opacity: 0.92, scale: 1, rotation: -14, duration: 0.5, ease: thunk }, ts + 0.5);
    cardTl.to({}, { duration: 0.35 });
    cardTl.eventCallback('onUpdate', placePen);
    placePen();
    gsap.set(penEl, { opacity: 0 });

    // headings that live in the pin: ghosts settle with the plates
    cardTl.fromTo('.stage__title .ghost--pink', { x: -9, y: 5 }, { x: -2, y: 1.5, duration: 1.2 }, 0);
    cardTl.fromTo('.stage__title .ghost--blue', { x: 9, y: -5 }, { x: 2, y: -1.5, duration: 1.2 }, 0);
    cardTl.add(gain($('.card__dots'), 1, 0.35, { duration: t }), 0);

    seamGain(seams[1]);

    /* ---- 3. how it works ---- */
    wipe($('.how'), 'right', 23);
    headingIn($('.how__title'));
    $$('.step').forEach((el, i) => {
      enter(el, { y: 90, rotation: `+=${i % 2 ? 6 : -6}`, opacity: 0 }, { y: 0, rotation: '-=0', opacity: 1, duration: 1.1, clearProps: 'opacity' }, { start: 'top 90%' });
      const ink = $$('.step__art .m', el);
      gsap.fromTo(ink, { x: (k) => (k % 2 ? 9 : -9), y: (k) => (k % 2 ? -6 : 7) }, { x: 0, y: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top 85%', end: 'center 50%', scrub: true } });
      const no = $$('.step__no .ghost', el);
      gsap.fromTo(no[0], { x: -9, y: 6 }, { x: -2, y: 1.5, ease: 'none', scrollTrigger: { trigger: el, start: 'top 85%', end: 'center 50%', scrub: true } });
      gsap.fromTo(no[1], { x: 9, y: -6 }, { x: 2, y: -1.5, ease: 'none', scrollTrigger: { trigger: el, start: 'top 85%', end: 'center 50%', scrub: true } });
    });

    seamGain(seams[2]);

    /* ---- 4. your own handwriting: the letters get boxed ---- */
    wipe($('.hand'), 'iris', 31, { cx: 20, cy: 6 });
    headingIn($('.hand__title'));
    gsap.fromTo('.sheet--a', { x: -70, rotation: -9, opacity: 0 }, { x: 0, rotation: -3, opacity: 1, ease: 'expo.out', duration: 1.2, clearProps: 'opacity', scrollTrigger: { trigger: '.hand__sheets', start: 'top 85%', toggleActions: 'play complete none none' } });
    gsap.fromTo('.sheet--b', { x: 90, rotation: 9, opacity: 0 }, { x: 0, rotation: 2.2, opacity: 1, ease: 'expo.out', duration: 1.2, delay: 0.15, clearProps: 'opacity', scrollTrigger: { trigger: '.hand__sheets', start: 'top 85%', toggleActions: 'play complete none none' } });
    const hwA = $$('.sheet--a .c'), hwB = $$('.sheet--b .c');
    gsap.set([hwA, hwB], { '--s': 0 });
    const hwTl = gsap.timeline({ scrollTrigger: { trigger: '.hand__sheets', start: 'top 70%', end: 'bottom 50%', scrub: 0.5 } });
    hwTl.to(hwA, { '--s': 1, stagger: 0.03, duration: 0.2, ease: 'none' }, 0)
      .to(hwB, { '--s': 1, stagger: 0.03, duration: 0.2, ease: 'none' }, '>-0.3');

    seamGain(seams[3]);

    /* ---- 5. pricing ---- */
    wipe($('.price'), 'left', 47);
    const bn = $$('.bignum .ghost');
    gsap.fromTo(bn[0], { x: -34, y: -20 }, { x: -6, y: -3, ease: 'none', scrollTrigger: { trigger: '.price__head', start: 'top 85%', end: 'bottom 45%', scrub: true } });
    gsap.fromTo(bn[1], { x: 34, y: 26 }, { x: 6, y: 4, ease: 'none', scrollTrigger: { trigger: '.price__head', start: 'top 85%', end: 'bottom 45%', scrub: true } });
    gsap.fromTo('.bignum', { clipPath: 'inset(-20% 100% -20% -20%)' }, { clipPath: 'inset(-20% -20% -20% -20%)', duration: 1, ease: 'expo.out', clearProps: 'clipPath', scrollTrigger: { trigger: '.bignum', start: 'top 90%', toggleActions: 'play complete none none' } });
    gsap.fromTo('.price__unit, .price__lead', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.12, clearProps: 'transform,opacity', scrollTrigger: { trigger: '.price__head', start: 'top 82%', toggleActions: 'play complete none none' } });
    gsap.fromTo({ g: 0.25 }, { g: 0.25 }, { g: 1, ease: 'none', onUpdate() { HT.draw($('.price__sun'), this.targets()[0].g); }, scrollTrigger: { trigger: '.price', start: 'top 80%', end: 'center 40%', scrub: true } });
    $$('.ticket').forEach((el, i) => {
      enter(el, { y: 80, rotation: i ? 6 : -6, opacity: 0 }, { y: 0, rotation: i ? 1.1 : -1.2, opacity: 1, duration: 1.1, clearProps: 'opacity' }, { start: 'top 90%' });
      gsap.fromTo($$('.ticks li', el), { x: -18, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: 'expo.out', stagger: 0.1, clearProps: 'transform,opacity', scrollTrigger: { trigger: el, start: 'top 75%', toggleActions: 'play complete none none' } });
    });

    /* ---- 6. FAQ ---- */
    wipe($('.faq'), 'down', 59);
    headingIn($('.faq__title'));
    gsap.fromTo('.qa', { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.08, clearProps: 'transform,opacity', scrollTrigger: { trigger: '.faq__list', start: 'top 85%', toggleActions: 'play complete none none' } });

    ['blue', 'pink', 'yellow'].forEach((c, i) => gsap.fromTo($(`.pigeon--faq .plate--${c}`), { xPercent: [-6, 6, 3][i], yPercent: [4, -5, 7][i], filter: 'blur(3px)' }, { xPercent: 0, yPercent: 0, filter: 'blur(0px)', ease: 'none', scrollTrigger: { trigger: '.pigeon--faq', start: 'top 90%', end: 'top 45%', scrub: true } }));

    /* ---- 7. closing CTA: the pigeon flies the dotted pen path ---- */
    seamGain(seams[4]);
    const cta = $('.cta');
    wipe(cta, 'iris', 71, { cx: 50, cy: 0 });
    headingIn($('.cta__title'));
    gsap.fromTo('.cta__sub, .cta .btn', { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.12, clearProps: 'transform,opacity', scrollTrigger: { trigger: cta, start: 'top 55%', toggleActions: 'play complete none none' } });
    gain($('.cta__dots'), 1, 0.3, { scrollTrigger: { trigger: cta, start: 'top 80%', end: 'bottom bottom', scrub: true } });
    cta.classList.add('is-flying');
    gsap.set('.pigeon--fly', { xPercent: -50, yPercent: -50 });
    const flyTl = gsap.timeline({ scrollTrigger: { trigger: cta, start: 'top 60%', end: 'bottom bottom', scrub: 0.8 } });
    flyTl.fromTo('.flight', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', ease: 'none', duration: 1 }, 0);
    flyTl.to('.pigeon--fly', { motionPath: { path: '#flight-path', align: '#flight-path', alignOrigin: [0.5, 0.5], autoRotate: false }, ease: 'none', duration: 1 }, 0);
    flyTl.fromTo('.pigeon--fly .plate--blue', { xPercent: -3, yPercent: 2, rotation: -1.5 }, { xPercent: 0, yPercent: 0, rotation: 0, duration: 0.5 }, 0);
    flyTl.fromTo('.pigeon--fly .plate--pink', { xPercent: 3, yPercent: -3 }, { xPercent: 0, yPercent: 0, duration: 0.5 }, 0);
    flyTl.fromTo('.pigeon--fly .plate--yellow', { xPercent: 2, yPercent: 4 }, { xPercent: 0, yPercent: 0, duration: 0.5 }, 0);

    return () => {
      split.revert();
      card.classList.remove('is-stack');
      cta.classList.remove('is-flying');
      [front, back, $('.card'), $('.how'), $('.hand'), $('.price'), $('.faq'), cta].forEach((el) => { el.style.clipPath = ''; });
      $$('.pigeon--fly, .stamp, .postmark').forEach((el) => gsap.set(el, { clearProps: 'all' }));
    };
  });

  /* fonts change line breaks and heights: measure again once they land */
  const settle = () => { ScrollTrigger.refresh(); redrawAll(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
  window.addEventListener('load', () => setTimeout(settle, 120));
})();
