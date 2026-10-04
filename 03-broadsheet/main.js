/* PenPigeon "Broadsheet": motion.
   GSAP + ScrollTrigger + SplitText + DrawSVG. Everything is built inside gsap.matchMedia(),
   so reduced-motion and no-JS visitors get the whole page, readable, with the note already written. */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* Date line: the date the page is being read (nothing invented). */
  try {
    const d = new Date();
    const el = $('#dateline');
    const pad = (n) => String(n).padStart(2, '0');
    el.setAttribute('datetime', `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    $('.d-long', el).textContent = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    $('.d-short', el).textContent = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) { /* keep the static fallback */ }

  if (!window.gsap || !window.ScrollTrigger || !window.SplitText) { root.classList.remove('js'); return; }
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);

  const runhead = $('#runhead');
  const heroPre = $$('.hero-pre');
  const fontsReady = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 1800))]);
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());

  const mm = gsap.matchMedia();

  mm.add({
    motion: '(prefers-reduced-motion: no-preference)',
    wide: '(min-width: 1000px) and (min-height: 700px)'
  }, (ctx) => {
    const { motion, wide } = ctx.conditions;
    let dead = false;
    const undo = [];

    /* Running head: shows once the front page has scrolled away. Instant toggle in both branches. */
    const setBar = (on) => runhead.classList.toggle('is-on', on);
    ScrollTrigger.create({
      trigger: wide && motion ? '#front-zone' : '.masthead',
      start: wide && motion ? 'bottom 84%' : 'bottom top',
      onEnter: () => setBar(true),
      onLeaveBack: () => setBar(false)
    });

    if (!motion) {
      heroPre.forEach((el) => { el.style.visibility = 'visible'; });
      return () => { dead = true; };
    }

    if (wide) { root.classList.add('is-staged'); undo.push(() => root.classList.remove('is-staged')); }

    /* ---------- Ticker (the facts line) ---------- */
    const ticker = $('#ticker');
    const track = $('.ticker-track', ticker);
    const set = $('.ticker-set', track);
    const half = document.createElement('div');
    half.className = 'ticker-half';
    track.insertBefore(half, set);
    half.appendChild(set);
    const copies = Math.max(1, Math.ceil((window.innerWidth * 1.1) / Math.max(1, set.offsetWidth)));
    for (let i = 1; i < copies; i++) half.appendChild(set.cloneNode(true));
    track.appendChild(half.cloneNode(true));
    ticker.classList.add('is-marquee');
    const pause = document.createElement('button');
    pause.type = 'button';
    pause.className = 'ticker-pause';
    pause.setAttribute('aria-pressed', 'false');
    pause.innerHTML = '<span class="sr">Pause the ticker</span><i aria-hidden="true"></i>';
    ticker.appendChild(pause);
    const tick = gsap.to(track, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
    pause.addEventListener('click', () => {
      const on = pause.getAttribute('aria-pressed') !== 'true';
      pause.setAttribute('aria-pressed', String(on));
      pause.firstElementChild.textContent = on ? 'Play the ticker' : 'Pause the ticker';
      tick.paused(on);
    });
    /* the press speeds up while you scroll */
    const speed = { s: 1 };
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        speed.s = Math.min(1 + Math.abs(self.getVelocity()) / 260, 8);
        tick.timeScale(speed.s);
        gsap.to(speed, { s: 1, duration: 1.4, ease: 'power3.out', overwrite: true, onUpdate: () => tick.timeScale(speed.s) });
      }
    });
    undo.push(() => {
      ticker.classList.remove('is-marquee');
      pause.remove();
      $$('.ticker-half', track).forEach((h, i) => { if (i) h.remove(); });
      track.appendChild(set); // restore a single set
      set.parentNode === track && $$('.ticker-set', half).forEach((s, i) => { if (i) s.remove(); });
      half.remove();
      gsap.set(track, { clearProps: 'transform' });
    });

    /* ---------- Hero: intro on load ---------- */
    const hed = $('#hed');
    const strip = $$('.mast-strip > *');
    const navLinks = $$('.mast-nav a');
    const mastCta = $('.mast-cta');
    const mark = $('.nameplate .mark');
    const word = $('.nameplate-word');

    gsap.set('.masthead .rule-double', { scaleX: 0 });
    gsap.set(strip, { autoAlpha: 0, y: 8 });
    gsap.set([navLinks, mastCta], { autoAlpha: 0, y: 10 });
    gsap.set(mark, { autoAlpha: 0, x: -36, rotate: -10 });
    gsap.set('.deck-text', { clipPath: 'inset(0 0 100% 0)' });
    gsap.set('.cta-row > *, .cta-note', { autoAlpha: 0, y: 14 });
    gsap.set(ticker, { clipPath: 'inset(0 100% 0 0)' });
    gsap.set('.masthead', { visibility: 'visible' });
    gsap.set([ticker, '.deck', '.cta'], { visibility: 'visible' });
    if (!wide) gsap.set(['.photo', '.index'], { visibility: 'visible' });

    const intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    intro
      .to('.masthead .rule-double', { scaleX: 1, duration: 1.3, ease: 'expo.inOut' }, 0)
      .to(strip, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08 }, 0.1)
      .to(mark, { autoAlpha: 1, x: 0, rotate: 0, duration: 1.1 }, 0.15)
      .to(navLinks, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.06 }, 0.55)
      .to(mastCta, { autoAlpha: 1, y: 0, duration: 0.8 }, 0.75)
      .to('.deck-text', { clipPath: 'inset(0 0 0% 0)', duration: 1.3, ease: 'power3.out', clearProps: 'clipPath' }, 1.05)
      .to('.cta-row > *, .cta-note', { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08 }, 1.3)
      .to(ticker, { clipPath: 'inset(0 0% 0 0)', duration: 1.4, ease: 'power3.inOut', clearProps: 'clipPath' }, 1.2);

    fontsReady.then(() => {
      if (dead) return;
      ctx.add(() => {
        const hs = SplitText.create(hed, { type: 'lines', mask: 'lines', linesClass: 'sl', aria: 'auto' });
        const ws = SplitText.create(word, { type: 'lines', mask: 'lines', linesClass: 'wl', aria: 'none' });
        gsap.set(hs.lines, { yPercent: 118 });
        gsap.set(ws.lines, { yPercent: 118 });
        gsap.set([hed, word], { visibility: 'visible' });
        intro
          .to(ws.lines, { yPercent: 0, duration: 1.2 }, 0.25)
          .to(hs.lines, { yPercent: 0, duration: 1.45, stagger: 0.16 }, 0.3);
        intro.play();
      });
    });

    /* ---------- Hero: headline scrubs down into the banner as the page prints ---------- */
    const frame = $('.photo-frame');
    const bar = $('.press-bar');
    if (wide) {
      const heroScale = () => {
        const grid = $('.lead-grid');
        const cs = getComputedStyle(grid);
        const inner = grid.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        return Math.max(1, inner / hed.offsetWidth);
      };
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: '#front-zone', start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true }
      });
      gsap.set('.photo, .index', { visibility: 'visible' });
      gsap.set('.caption, .index-title', { autoAlpha: 0 });
      tl.fromTo(hed, { scale: heroScale }, { scale: 1, duration: 0.62, ease: 'power3.inOut' }, 0)
        .fromTo(frame, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.46, ease: 'power2.inOut' }, 0.3)
        .set(bar, { opacity: 1 }, 0.3)
        .fromTo(bar, { y: -4 }, { y: () => frame.offsetHeight - 4, duration: 0.46, ease: 'power2.inOut' }, 0.3)
        .set(bar, { opacity: 0 }, 0.77)
        .fromTo('.index ul', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.38, ease: 'power2.inOut' }, 0.45)
        .fromTo('.index-title', { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.18 }, 0.42)
        .fromTo('.caption', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.2 }, 0.66)
        .to({}, { duration: 0.0001 }, 1);
    } else {
      gsap.from('.photo-frame', {
        clipPath: 'inset(0 0 100% 0)', duration: 1.4, ease: 'power3.inOut', clearProps: 'clipPath',
        scrollTrigger: { trigger: '.photo', start: 'top 88%', once: true }
      });
      gsap.from('.index li', {
        y: 18, autoAlpha: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out',
        scrollTrigger: { trigger: '.index', start: 'top 90%', once: true }
      });
    }

    /* ---------- Shared reveals ---------- */

    // Headlines: SplitText line masks, giant lines rising out of the rule.
    $$('.split').forEach((el) => {
      el.classList.add('is-split');
      SplitText.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'sl', autoSplit: true, aria: 'auto',
        onSplit(self) {
          return gsap.from(self.lines, {
            yPercent: 118, duration: 1.3, ease: 'expo.out', stagger: 0.13,
            scrollTrigger: { trigger: el, start: 'top 88%', once: true }
          });
        }
      });
    });

    // Rules draw out across the grid as they enter.
    $$('.flag .rule, .step .rule, .pull .rule, .foot .rule, .sec.try > .wrap > .rule').forEach((el) => {
      gsap.from(el, {
        scaleX: 0, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 96%', end: 'top 62%', scrub: true }
      });
    });
    $$('.flag-row').forEach((el) => {
      gsap.from(el, { autoAlpha: 0, y: 8, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 94%', once: true } });
    });

    // Body text prints top to bottom.
    $$('.print').forEach((el) => {
      gsap.from(el, {
        clipPath: 'inset(0 0 100% 0)', duration: 1.2, ease: 'power3.out', clearProps: 'clipPath',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true }
      });
    });

    // Steps: numerals rise out of their masks, copy follows.
    $$('.step').forEach((step) => {
      const st = { trigger: step, start: 'top 86%', once: true };
      gsap.from($('.num', step), { yPercent: 108, duration: 1.2, ease: 'expo.out', scrollTrigger: st });
      gsap.from($$('h3, p', step), { y: 18, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.09, delay: 0.18, scrollTrigger: st });
    });
    gsap.from('.pull-mark', { y: 30, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.pull', start: 'top 85%', once: true } });

    // Classifieds are set in type, line by line.
    gsap.from('.plan-box', {
      clipPath: 'inset(0 100% 0 0)', duration: 1.3, ease: 'power3.inOut', clearProps: 'clipPath',
      scrollTrigger: { trigger: '.plan-box', start: 'top 88%', once: true }
    });
    $$('.ad').forEach((ad) => {
      gsap.from($$('.ad-head, .ad-list li, .plan-name, .plan-price, .plan-list li, .small-ad', ad), {
        y: 16, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.07,
        scrollTrigger: { trigger: ad, start: 'top 86%', once: true }
      });
    });

    // Corrections.
    gsap.from('.qa', {
      y: 18, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.09,
      scrollTrigger: { trigger: '.corrections', start: 'top 84%', once: true }
    });

    // Closing + footer wordmark.
    gsap.from('.try-row > *', {
      y: 20, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: '.try-row', start: 'top 90%', once: true }
    });
    gsap.from('.foot-word-in', {
      yPercent: 105, duration: 1.4, ease: 'expo.out',
      scrollTrigger: { trigger: '.foot-word', start: 'top 96%', once: true }
    });
    gsap.from('.foot-grid > *', {
      y: 14, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1,
      scrollTrigger: { trigger: '.foot-grid', start: 'top 92%', once: true }
    });

    /* ---------- SIGNATURE: the editor's red pen marks up the printed page ---------- */
    const circle = $$('.mk-circle path');
    const under = $$('.mk-under path');
    const notePaths = $$('.note path');
    const noteCap = $('.note-fig figcaption');
    const penAll = [...circle, ...under, ...notePaths];
    gsap.set(penAll, { drawSVG: '0%', opacity: 0 });
    gsap.set(noteCap, { autoAlpha: 0 });

    const lens = notePaths.map((p) => p.getTotalLength());
    const lenSum = lens.reduce((a, b) => a + b, 0);
    const drawNote = (tl, at, span) => {
      let t = at;
      notePaths.forEach((p, i) => {
        const dur = (lens[i] / lenSum) * span;
        tl.set(p, { opacity: 1 }, t).fromTo(p, { drawSVG: '0%' }, { drawSVG: '100%', duration: dur, ease: 'none' }, t);
        t += dur;
      });
      return t;
    };
    const drawMarks = (tl, at) => {
      let t = at;
      circle.forEach((p) => { tl.set(p, { opacity: 1 }, t).fromTo(p, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.1, ease: 'power1.inOut' }, t); t += 0.1; });
      t += 0.02;
      under.forEach((p) => { tl.set(p, { opacity: 1 }, t).fromTo(p, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.05, ease: 'power1.inOut' }, t); t += 0.05; });
      return t;
    };

    if (wide) {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: '.hand-zone', start: 'top top', end: 'bottom bottom', scrub: 0.5 }
      });
      let t = drawMarks(tl, 0.1);
      t = drawNote(tl, t + 0.04, 0.58);
      tl.to(noteCap, { autoAlpha: 1, duration: 0.06 }, t).to({}, { duration: 0.0001 }, 1.02);
    } else {
      const m = gsap.timeline({ scrollTrigger: { trigger: '.lede', start: 'top 70%', end: 'bottom 40%', scrub: 0.4 } });
      drawMarks(m, 0);
      const n = gsap.timeline({ scrollTrigger: { trigger: '.note-fig', start: 'top 85%', end: 'bottom 50%', scrub: 0.4 } });
      const end = drawNote(n, 0, 1);
      n.to(noteCap, { autoAlpha: 1, duration: 0.08 }, end);
    }

    ScrollTrigger.refresh();
    return () => { dead = true; undo.forEach((fn) => fn()); };
  });
})();
