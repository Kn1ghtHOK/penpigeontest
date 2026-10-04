/* PenPigeon, "Sticker Slap". Things get slapped onto the page.
   GSAP 3.15: ScrollTrigger (pin + triggers), CustomBounce + CustomWiggle (thunk, screen shake),
   DrawSVG (the real plotted note), SplitText, Draggable + InertiaPlugin, ScrollToPlugin. */
(function () {
  'use strict';
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger, CustomEase, CustomBounce, CustomWiggle, SplitText, DrawSVGPlugin, Draggable, InertiaPlugin, ScrollToPlugin);

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const rnd = gsap.utils.random;
  const clamp = gsap.utils.clamp;
  const NS = 'http://www.w3.org/2000/svg';
  const nav = $('#nav');
  const navH = () => nav ? nav.offsetHeight : 68;
  const rest = (el) => (el.dataset && el.dataset.r !== undefined) ? parseFloat(el.dataset.r) : (gsap.getProperty(el, 'rotation') || 0);

  CustomWiggle.create('shakeEase', { wiggles: 7, type: 'easeOut' });
  CustomBounce.create('thunk', { strength: 0.55, squash: 2.2, squashID: 'thunkSquash' });

  /* ---------- helpers ---------- */

  // Comic impact lines that burst out of a piece when it lands.
  function addPow(host, o = {}) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '-50 -50 100 100');
    s.setAttribute('class', 'pow');
    s.setAttribute('aria-hidden', 'true');
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = (i * 36 + 9) * Math.PI / 180;
      d += `M${(Math.cos(a) * 31).toFixed(1)} ${(Math.sin(a) * 31).toFixed(1)}L${(Math.cos(a) * 46).toFixed(1)} ${(Math.sin(a) * 46).toFixed(1)}`;
    }
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    s.appendChild(p);
    if (o.x) s.style.left = o.x;
    if (o.y) s.style.top = o.y;
    if (o.size) { s.style.width = o.size; s.style.margin = `calc(${o.size} / -2) 0 0 calc(${o.size} / -2)`; }
    host.appendChild(s);
    host._pow = s;
    return s;
  }
  function popPow(host) {
    const pow = host._pow;
    if (!pow) return;
    gsap.fromTo(pow, { autoAlpha: 1, scale: 0.55 }, { scale: 1.05, autoAlpha: 0, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
  }
  function shake(el, amp = 5) {
    if (!el) return;
    gsap.fromTo(el, { x: 0, y: 0 }, { x: rnd([-1, 1]) * amp, y: rnd([-1, 1]) * amp * 0.7, duration: 0.42, ease: 'shakeEase', overwrite: 'auto' });
  }

  const FROM = {
    t: () => ({ x: rnd(-70, 70), y: -460 }),
    l: () => ({ x: -520, y: rnd(-90, 90) }),
    r: () => ({ x: 520, y: rnd(-90, 90) }),
    b: () => ({ x: rnd(-70, 70), y: 460 }),
    c: () => ({ x: 0, y: 0 })
  };

  // A card or sticker flies in from the camera and thunks down: scale + rotation overshoot, then settle.
  function slapIn(tl, el, pos, o = {}) {
    const r = o.rot !== undefined ? o.rot : rest(el);
    const off = FROM[o.from || rnd(['t', 'l', 'r'])]();
    const dur = o.dur || 0.55;
    tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1, ease: 'none', immediateRender: true }, pos);
    const tw = gsap.fromTo(el,
      { scale: o.scale || 2.3, rotation: r + rnd(-26, 26), x: off.x, y: off.y },
      { scale: 1, rotation: r, x: 0, y: 0, duration: dur, ease: o.ease || 'back.out(1.9)', immediateRender: true });
    tl.add(tw, pos);
    if (o.shake || o.pow) {
      tl.call(() => {
        if (tl.reversed()) return;
        if (o.shake) shake(o.shake, o.amp || 5);
        if (o.pow) popPow(o.powHost || el);
      }, null, tw.startTime() + dur * 0.4);
    }
    return tw;
  }
  // Labels drop in and bounce (CustomBounce) with a squash.
  function dropIn(tl, el, pos, o = {}) {
    const r = rest(el);
    const dur = o.dur || 0.95;
    tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08, ease: 'none', immediateRender: true }, pos);
    tl.fromTo(el, { y: -300, rotation: r + rnd(-24, 24) }, { y: 0, rotation: r, duration: dur, ease: 'thunk', immediateRender: true }, pos);
    tl.fromTo(el, { scaleX: 1, scaleY: 1, transformOrigin: '50% 100%' }, { scaleX: 1.14, scaleY: 0.82, duration: dur, ease: 'thunkSquash', immediateRender: false }, pos);
  }
  // Stickers spin and pop.
  function spinIn(tl, el, pos, o = {}) {
    const r = rest(el);
    tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08, ease: 'none', immediateRender: true }, pos);
    const tw = gsap.fromTo(el, { scale: 0, rotation: r - 220 }, { scale: 1, rotation: r, duration: o.dur || 0.75, ease: 'back.out(2.6)', immediateRender: true });
    tl.add(tw, pos);
    return tw;
  }

  // The real plotted note: draws stroke by stroke at a constant pen speed, with the pen riding the tip.
  function buildDraw(svg) {
    let host = $('[data-draw]', svg);
    if (host) {
      const g = document.createElementNS(NS, 'g');
      $$('#note path').forEach((p) => g.appendChild(p.cloneNode(true)));
      host.replaceWith(g);
    }
    const paths = $$('path', svg);
    const nib = $('[data-nib]', svg);
    const SPEED = 1100;
    const tl = gsap.timeline({ paused: true });
    const segs = [];
    let t = 0;
    paths.forEach((p) => {
      const len = p.getTotalLength();
      const dur = Math.max(0.05, len / SPEED);
      tl.fromTo(p, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: dur, ease: 'none', immediateRender: true }, t);
      segs.push({ p, len, start: t, dur });
      t += dur + 0.045;
    });
    if (nib) {
      gsap.set(nib, { scale: 1.25, autoAlpha: 0 });
      tl.eventCallback('onUpdate', () => {
        const time = tl.time();
        const pr = tl.progress();
        if (pr <= 0 || pr >= 1) { gsap.set(nib, { autoAlpha: 0 }); return; }
        let seg = segs[0];
        for (const s of segs) { if (time >= s.start) seg = s; else break; }
        const k = clamp(0, 1, (time - seg.start) / seg.dur);
        const pt = seg.p.getPointAtLength(seg.len * k);
        gsap.set(nib, { x: pt.x, y: pt.y, autoAlpha: 1 });
      });
    }
    return tl;
  }

  // Decorative stickers you can grab and fling.
  function initDrag(zoneSel, inertia) {
    const zone = $(zoneSel);
    if (!zone) return;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const pieces = $$('[data-drag]', zone).filter((el) => !(coarse && el.matches('.card')));
    const tidy = $('.tidy', zone);
    const drags = [];
    let z = 30;
    const settle = (el) => gsap.to(el, { rotation: rest(el) + rnd(-3, 3), scale: 1, duration: 0.8, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
    pieces.forEach((el) => {
      const d = Draggable.create(el, {
        type: 'x,y', bounds: zone, inertia: inertia, edgeResistance: 0.7, minimumMovement: 4, allowContextMenu: false,
        onPress() {
          this.update(true);
          gsap.killTweensOf(el, 'rotation,scale');
          gsap.set(el, { zIndex: ++z });
          gsap.to(el, { scale: 1.06, duration: 0.16, ease: 'power2.out' });
        },
        onDragStart() {
          if (tidy) tidy.hidden = false;
        },
        onDrag() {
          const vx = inertia ? InertiaPlugin.getVelocity(el, 'x') : 0;
          gsap.to(el, { rotation: rest(el) + clamp(-16, 16, vx / 70), duration: 0.25, overwrite: 'auto' });
        },
        onRelease() { if (!inertia) settle(el); else gsap.to(el, { scale: 1, duration: 0.3, ease: 'back.out(3)' }); },
        onThrowComplete() { settle(el); }
      })[0];
      drags.push(d);
    });
    if (tidy) {
      tidy.addEventListener('click', () => {
        pieces.forEach((el, i) => {
          gsap.killTweensOf(el);
          gsap.to(el, {
            x: 0, y: 0, rotation: rest(el), scale: 1, duration: 0.8, delay: i * 0.05, ease: 'back.out(1.6)',
            onUpdate: () => drags[i] && drags[i].update(),
            onComplete: () => drags[i] && drags[i].update(true)
          });
        });
        tidy.hidden = true;
      });
    }
  }

  /* ---------- nav, menu, anchors ---------- */
  const menuBtn = $('.menu-btn');
  const setMenu = (open) => {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? 'Close' : 'Menu';
  };
  menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      setMenu(false);
      if (reduceQuery.matches) target.scrollIntoView();
      else gsap.to(window, { scrollTo: { y: target, offsetY: navH() }, duration: 1.1, ease: 'power3.inOut' });
      history.replaceState(null, '', id);
    });
  });

  /* ---------- everything else, behind matchMedia ---------- */
  const mm = gsap.matchMedia();
  mm.add({
    motion: '(prefers-reduced-motion: no-preference)',
    reduce: '(prefers-reduced-motion: reduce)',
    wide: '(min-width: 960px)'
  }, (ctx) => {
    const { reduce, wide } = ctx.conditions;

    // Reduced motion (and no-JS): everything visible and settled. Stickers still draggable, without the fling.
    if (reduce) {
      initDrag('#hero-zone', false);
      initDrag('#cta-zone', false);
      return;
    }

    const heroInner = $('.hero-inner');

    /* Marquee strips: drift, speed up with scroll velocity */
    const strips = $$('[data-strip]');
    const tws = strips.map((s) => {
      const dir = +s.dataset.strip;
      return gsap.fromTo($('.strip-track', s), { xPercent: dir > 0 ? 0 : -50 }, { xPercent: dir > 0 ? -50 : 0, duration: 42, ease: 'none', repeat: -1 });
    });
    let boost = 1, stripsOn = false;
    ScrollTrigger.create({
      trigger: '.strips', start: 'top bottom', end: 'bottom top',
      onToggle: (self) => { stripsOn = self.isActive; },
      onUpdate: (self) => { boost = Math.max(boost, 1 + Math.min(Math.abs(self.getVelocity()) / 220, 7)); }
    });
    const tick = () => {
      if (!stripsOn) return;
      boost += (1 - boost) * 0.06;
      tws.forEach((tw) => tw.timeScale(boost));
    };
    gsap.ticker.add(tick);

    /* Section headings: words get slapped on */
    $$('[data-h2]').forEach((h) => {
      const split = SplitText.create(h, { type: 'words', aria: 'auto' });
      gsap.set(split.words, { autoAlpha: 0 });
      gsap.set(h, { visibility: 'visible' });
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(split.words, { y: -50, scale: 1.55, rotation: () => rnd(-12, 12) }, { y: 0, scale: 1, rotation: 0, duration: 0.55, ease: 'back.out(2)', stagger: 0.08, immediateRender: true });
      tl.fromTo(split.words, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, stagger: 0.08, ease: 'none', immediateRender: true }, 0);
      ScrollTrigger.create({ trigger: h, start: 'top 85%', once: true, onEnter: () => tl.play() });
    });

    /* Small things rise and settle */
    ScrollTrigger.batch('[data-rise]', {
      start: 'top 90%', once: true,
      onEnter: (els) => {
        els.forEach((el) => {
          const r = rest(el);
          gsap.fromTo(el, { autoAlpha: 0, y: 38, rotation: r + rnd(-2.5, 2.5) }, {
            autoAlpha: 1, y: 0, rotation: r, duration: 0.65, ease: 'back.out(1.6)', delay: els.indexOf(el) * 0.08,
            onComplete: () => { if (el.matches('.btn')) gsap.set(el, { clearProps: 'transform' }); }
          });
        });
      }
    });

    /* ---------- HERO intro ---------- */
    const hero = $('.hero');
    const ready = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 1400))]);
    ready.then(() => ctx.add(() => {
      const h1 = $('#hero-title');
      const split = SplitText.create(h1, { type: 'words', aria: 'auto' });
      gsap.set(split.words, { autoAlpha: 0 });
      gsap.set(h1, { visibility: 'visible' });

      const copy = $$('[data-in]', hero).filter((e) => !e.matches('.facts'));
      const factUl = $('.facts', hero);
      const factLis = $$('li', factUl);
      const factRot = factLis.map((el) => rest(el));
      const backCard = $('#hero-back');
      const frontCard = $('.card.front', hero);
      const pieces = $$('.collage .p', hero);
      [backCard, frontCard].forEach((c) => addPow(c));
      const note = buildDraw($('svg.note', backCard));

      const tl = gsap.timeline({ delay: 0.05 });
      tl.fromTo(split.words, { y: -110, scale: 1.8, rotation: () => rnd(-16, 16) }, { y: 0, scale: 1, rotation: 0, duration: 0.62, ease: 'back.out(2)', stagger: 0.11, immediateRender: true }, 0);
      tl.fromTo(split.words, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1, stagger: 0.11, ease: 'none', immediateRender: true }, 0);
      tl.call(() => shake(heroInner, 3), null, 0.5);
      tl.call(() => shake(heroInner, 3), null, 0.72);
      tl.fromTo(copy, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.1, immediateRender: true }, 0.55);
      tl.set(factUl, { autoAlpha: 1 }, 0.8);
      tl.fromTo(factLis, { autoAlpha: 0, scale: 1.9, y: -20, rotation: (i) => factRot[i] + rnd(-14, 14) }, { autoAlpha: 1, scale: 1, y: 0, rotation: (i) => factRot[i], duration: 0.5, ease: 'back.out(2.2)', stagger: 0.1, immediateRender: true }, 0.8);

      // the collage, piece by piece, each one a thunk
      const at = { back: 0.35, front: 0.95 };
      slapIn(tl, backCard, at.back, { from: 'r', shake: heroInner, amp: 5, pow: true });
      tl.add(() => note.timeScale(1.7).play(), at.back + 0.5);
      dropIn(tl, pieces[1], at.back + 0.55);                       // tape on back card
      slapIn(tl, frontCard, at.front, { from: 'l', shake: heroInner, amp: 5, pow: true });
      dropIn(tl, pieces[3], at.front + 0.5);                       // tape on front card
      dropIn(tl, pieces[4], 1.55);                                  // Sample note
      dropIn(tl, pieces[5], 1.7);                                   // Sample photo
      slapIn(tl, pieces[6], 1.6, { from: 'c', scale: 3.4, ease: 'back.out(2.4)', shake: heroInner, amp: 6 }); // stamp
      slapIn(tl, pieces[7], 1.78, { from: 'c', scale: 2.8, ease: 'back.out(2)' });                            // postmark
      spinIn(tl, pieces[8], 1.85);                                  // pigeon
      spinIn(tl, pieces[9], 2.0);                                   // Written in pen
      tl.eventCallback('onComplete', () => ctx.add(() => initDrag('#hero-zone', true)));
      gsap.delayedCall(9, () => $$('.pre', hero).forEach((el) => { if (getComputedStyle(el).visibility === 'hidden') gsap.set(el, { autoAlpha: 1 }); }));
    }));

    /* ---------- HOW IT WORKS: the board ---------- */
    const how = $('#how');
    const steps = $$('.step', how);
    const stage = $('.how-inner', how);
    const arts = $$('.art', how);

    const tls = [];
    const build = () => {
      const [a1, a2, a3, a4] = arts;
      // 01 photo + pan / zoom / straighten
      let tl = gsap.timeline({ paused: true });
      const front = $('.front', a1);
      addPow(front);
      slapIn(tl, front, 0, { from: 'l', shake: stage, amp: 5, pow: true, scale: 2.5 });
      tl.fromTo($('.scene', front), { scale: 1.6, rotation: -8, xPercent: -8 }, { scale: 1.05, rotation: 0, xPercent: 0, duration: 1.2, ease: 'power3.inOut' }, 0.55);
      $$('.tag', a1).filter((t) => t.classList.contains('p')).forEach((t, i) => dropIn(tl, t, 0.65 + i * 0.16));
      tls.push(tl);

      // 02 handwriting stickers
      tl = gsap.timeline({ paused: true });
      const st = $$('.st', a2);
      slapIn(tl, st[0], 0, { from: 't', shake: stage, amp: 4 });
      slapIn(tl, st[1], 0.16, { from: 'r', shake: stage, amp: 4 });
      slapIn(tl, st[2], 0.32, { from: 'b', shake: stage, amp: 4 });
      tls.push(tl);

      // 03 the note card (the pen draws on it separately, scrubbed or timed)
      tl = gsap.timeline({ paused: true });
      const back = $('.p-back', a3);
      addPow(back);
      slapIn(tl, back, 0, { from: 'b', shake: stage, amp: 7, pow: true, scale: 2.6 });
      tls.push(tl);

      // 04 address, stamp, postmark
      tl = gsap.timeline({ paused: true });
      const overlay = $('.p-overlay', a4);
      addPow(overlay, { x: '90%', y: '24%', size: '46%' });
      const addrLines = $$('.addr b', a4);
      tl.fromTo($('.addr', a4), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1, immediateRender: true }, 0);
      tl.fromTo(addrLines, { autoAlpha: 0, x: -14 }, { autoAlpha: 1, x: 0, duration: 0.3, stagger: 0.14, ease: 'power2.out', immediateRender: true }, 0.05);
      const stamp = $('.stamp-s', a4), pm = $('.postmark-s', a4);
      const stw = slapIn(tl, stamp, 0.5, { from: 'c', scale: 3.6, rot: 6, ease: 'back.out(2.6)', dur: 0.5 });
      tl.call(() => { if (!tl.reversed()) { shake(stage, 8); popPow(overlay); } }, null, stw.startTime() + 0.22);
      slapIn(tl, pm, 0.85, { from: 'c', scale: 3, rot: -10, ease: 'back.out(2)', dur: 0.45 });
      $$('.tag', a4).filter((t) => t.classList.contains('p')).forEach((t, i) => dropIn(tl, t, 1.0 + i * 0.18));
      tls.push(tl);

      const draw = buildDraw($('svg.note', a3));
      return draw;
    };

    if (wide) {
      // Desktop: pin the board, drive the four steps from scroll position.
      how.classList.add('is-pinned');
      const draw = build();
      const THRESH = [0, 0.22, 0.45, 0.74];
      const DRAW = [0.5, 0.72];
      const on = [false, false, false, false];
      let progress = 0, entered = false, current = -2;

      const update = () => {
        let n = -1;
        if (entered) { n = 0; THRESH.forEach((t, i) => { if (progress >= t) n = i; }); }
        if (n !== current) {
          current = n;
          tls.forEach((tl, i) => {
            const want = i <= n;
            if (want && !on[i]) { on[i] = true; tl.timeScale(1).play(); }
            else if (!want && on[i]) { on[i] = false; tl.timeScale(2.4).reverse(); }
          });
          steps.forEach((s, i) => {
            const active = i === n;
            if (active !== s.classList.contains('is-active')) {
              s.classList.toggle('is-active', active);
              const card = $('.step-card', s);
              if (active) gsap.fromTo(card, { scale: 0.94, rotation: -4 }, { scale: 1, rotation: -1, duration: 0.5, ease: 'back.out(3)', overwrite: true });
              else gsap.to(card, { scale: 1, rotation: 0, duration: 0.2, overwrite: true });
            }
          });
        }
        const dp = n >= 2 ? clamp(0, 1, (progress - DRAW[0]) / (DRAW[1] - DRAW[0])) : 0;
        gsap.to(draw, { progress: dp, duration: 0.4, ease: 'none', overwrite: true });
      };

      ScrollTrigger.create({
        trigger: $('.how-pin', how), start: () => `top ${navH()}px`, end: '+=260%', pin: true, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: (self) => { progress = self.progress; update(); }
      });
      ScrollTrigger.create({
        trigger: how, start: 'top 58%',
        onEnter: () => { entered = true; update(); },
        onLeaveBack: () => { entered = false; update(); }
      });
      update();
    } else {
    // Mobile and tablet: no pin. Each step's pieces get slapped on as they scroll into view.
    const draw = build();
    arts.forEach((art, i) => {
      ScrollTrigger.create({
        trigger: art, start: 'top 80%', once: true,
        onEnter: () => {
          tls[i].play();
          if (i === 2) gsap.delayedCall(0.6, () => draw.timeScale(1.5).play());
        }
      });
    });
    $$('.step-card', how).forEach((c) => {
      gsap.set(c, { autoAlpha: 0 });
      ScrollTrigger.create({
        trigger: c, start: 'top 90%', once: true,
        onEnter: () => gsap.fromTo(c, { autoAlpha: 0, y: 30, rotation: rnd(-3, 3) }, { autoAlpha: 1, y: 0, rotation: 0, duration: 0.6, ease: 'back.out(1.8)' })
      });
    });
    }

    /* ---------- OWN HANDWRITING ---------- */
    const sheets = $$('.sheet');
    const sheetTL = gsap.timeline({ paused: true });
    const handArt = $('.hand-art');
    sheets.forEach((s) => gsap.set(s, { autoAlpha: 0 }));
    const tapesH = $$('.tape-a, .tape-b');
    gsap.set(tapesH, { autoAlpha: 0 });
    const splits = $$('.sheet-txt[data-split]').map((p) => SplitText.create(p, { type: 'words,chars', charsClass: 'ch', aria: 'auto' }));
    slapIn(sheetTL, sheets[0], 0, { from: 'l', shake: handArt, amp: 4 });
    slapIn(sheetTL, sheets[1], 0.28, { from: 'r', shake: handArt, amp: 4 });
    dropIn(sheetTL, tapesH[0], 0.55);
    dropIn(sheetTL, tapesH[1], 0.8);
    splits.forEach((sp, i) => {
      sheetTL.fromTo(sp.chars, { '--f': 0 }, { '--f': 1, duration: 0.3, ease: 'power2.out', stagger: { each: 0.045 } }, 1.0 + i * 0.5);
    });
    ScrollTrigger.create({ trigger: handArt, start: 'top 75%', once: true, onEnter: () => sheetTL.play() });

    const tiles = $$('.tiles li');
    const tileRot = tiles.map((t) => gsap.getProperty(t, 'rotation'));
    const tilesTL = gsap.timeline({ paused: true });
    tilesTL.fromTo(tiles, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08, ease: 'none', stagger: 0.035, immediateRender: true }, 0);
    tilesTL.fromTo(tiles, { y: -220, rotation: (i) => tileRot[i] + (i % 2 ? 22 : -22) }, { y: 0, rotation: (i) => tileRot[i], duration: 0.9, ease: 'thunk', stagger: 0.035, immediateRender: true }, 0);
    ScrollTrigger.create({ trigger: '.tiles', start: 'top 88%', once: true, onEnter: () => tilesTL.play() });

    /* ---------- PRICING ---------- */
    const burst = $('.burst-wrap');
    const plan = $('#plan');
    const grid = $('.price-grid');
    gsap.set([burst, plan], { autoAlpha: 0 });
    const priceTL = gsap.timeline({ paused: true });
    slapIn(priceTL, burst, 0, { from: 'l', shake: grid, amp: 5, rot: 0, scale: 2.6 });
    slapIn(priceTL, plan, 0.35, { from: 'r', shake: grid, amp: 6, rot: 2, scale: 2.2 });
    ScrollTrigger.create({ trigger: grid, start: 'top 72%', once: true, onEnter: () => priceTL.play() });
    gsap.to(burst, { rotation: '+=28', ease: 'none', scrollTrigger: { trigger: '.price', start: 'top bottom', end: 'bottom top', scrub: 1 } });

    /* ---------- FAQ ---------- */
    $$('.q').forEach((d) => {
      d.addEventListener('toggle', () => {
        gsap.fromTo(d, { scale: 0.985 }, { scale: 1, duration: 0.45, ease: 'back.out(3)', overwrite: 'auto' });
        if (d.open) gsap.fromTo($('.a', d), { autoAlpha: 0, y: -14 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'back.out(2)' });
      });
    });

    /* ---------- CLOSING CTA ---------- */
    const ctaGrid = $('.cta-grid');
    const cp = $$('#cta-collage .p');
    const ctaCard = cp[0];
    addPow(ctaCard);
    const ctaTL = gsap.timeline({ paused: true });
    slapIn(ctaTL, ctaCard, 0, { from: 'l', shake: ctaGrid, amp: 5, pow: true, scale: 2.5 });
    dropIn(ctaTL, cp[1], 0.5);
    slapIn(ctaTL, cp[2], 0.6, { from: 'c', scale: 3.4, shake: ctaGrid, amp: 6 });
    slapIn(ctaTL, cp[5], 0.78, { from: 'c', scale: 2.8, ease: 'back.out(2)' });
    spinIn(ctaTL, cp[3], 0.9);
    spinIn(ctaTL, cp[4], 1.05);
    ctaTL.eventCallback('onComplete', () => ctx.add(() => initDrag('#cta-zone', true)));
    ScrollTrigger.create({ trigger: '.cta-zone', start: 'top 78%', once: true, onEnter: () => ctaTL.play() });

    /* ---------- FOOTER ---------- */
    const letters = $$('.foot-letters span');
    const letterRot = letters.map((el) => rest(el));
    gsap.set(letters, { autoAlpha: 0 });
    const footTL = gsap.timeline({ paused: true });
    footTL.fromTo(letters, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08, ease: 'none', stagger: 0.08, immediateRender: true }, 0);
    footTL.fromTo(letters, { y: -320, rotation: (i) => letterRot[i] + rnd(-25, 25) }, { y: 0, rotation: (i) => letterRot[i], duration: 1, ease: 'thunk', stagger: 0.08, immediateRender: true }, 0);
    ScrollTrigger.create({ trigger: '.foot-letters', start: 'top 98%', once: true, onEnter: () => footTL.play() });

    return () => {
      gsap.ticker.remove(tick);
      how.classList.remove('is-pinned');
      steps.forEach((s) => s.classList.remove('is-active'));
    };
  });

  window.__ppReady = true;
  const refresh = () => ScrollTrigger.refresh();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  window.addEventListener('load', refresh);
})();
