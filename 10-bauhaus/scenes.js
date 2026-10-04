/* PenPigeon / Bauhaus poster: the shared set of geometric pieces.
   One set of 16 pieces (circles, half-circles, a quarter, triangles, rectangles)
   is rebuilt into the pigeon, then into four other compositions.
   Compositions live in a 100 x 100 local box; a "placement" maps that box onto the screen.
   Plain global script (no modules) so the page works from file://. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';

  var COL = {
    paper: '#EFE8D8', ink: '#121212', red: '#C9221A', yellow: '#F4B30B', blue: '#1C3FAA'
  };

  /* Every shape is centred on its own origin so rotation and scale pivot on the middle. */
  var GEO = {
    circle: 'M-.5 0A.5 .5 0 1 1 .5 0A.5 .5 0 1 1 -.5 0Z',
    half: 'M-.5 .25A.5 .5 0 0 1 .5 .25Z',
    quarter: 'M-.5 .5L-.5 -.5A1 1 0 0 1 .5 .5Z',
    tri: 'M-.5 .5L.5 .5L0 -.5Z',
    rect: 'M-.5 -.5H.5V.5H-.5Z',
    sweep: 'M-.5 0A.5 .5 0 0 1 .5 0Z'
  };
  var SHAPE = {
    sweep: 'sweep', card: 'rect', sq: 'rect', legL: 'rect', legR: 'rect', tail: 'tri', body: 'circle',
    wing: 'half', head: 'circle', beak: 'tri', eye: 'circle', quarter: 'quarter', tri2: 'tri',
    barA: 'rect', barB: 'rect', dot: 'circle'
  };
  /* Draw order, bottom to top. */
  var ORDER = ['sweep', 'card', 'sq', 'legL', 'legR', 'tail', 'body', 'wing', 'head', 'beak', 'eye',
    'quarter', 'tri2', 'barA', 'barB', 'dot'];
  var PIECES = ORDER.filter(function (id) { return id !== 'sweep'; });

  /* State: [x, y, rotation, width, height, fill]  (height defaults to width for round shapes). */
  var SCENES = {
    pigeon: {
      bg: 'paper', sweep: [47, 52, 100, 'red'],
      card: [93, 78, -7, 28, 18, 'yellow'],
      sq: [9, 75, 10, 9, 9, 'red'],
      legL: [37, 79, 0, 2.8, 16, 'ink'],
      legR: [51, 79, 0, 2.8, 16, 'ink'],
      tail: [19, 56, -100, 18, 30, 'ink'],
      body: [43, 54, 0, 44, 44, 'blue'],
      wing: [45, 50, -30, 32, 32, 'yellow'],
      head: [68, 32, 0, 24, 24, 'ink'],
      beak: [84.5, 33, 90, 9, 15, 'yellow'],
      eye: [72, 29, 0, 5, 5, 'paper'],
      quarter: [10, 16, 0, 22, 22, 'red'],
      tri2: [90, 12, 20, 12, 12, 'ink'],
      barA: [50, 88, 0, 66, 3, 'ink'],
      barB: [62, 93.5, 0, 36, 3, 'ink'],
      dot: [28, 9, 0, 8, 8, 'blue']
    },
    carry: {
      bg: 'paper', sweep: [52, 44, 100, 'red'],
      card: [103, 21, -14, 31, 20, 'yellow'],
      sq: [112, 14, -14, 7, 8, 'red'],
      legL: [36, 71, 20, 2.8, 11, 'ink'],
      legR: [51, 72, -18, 2.8, 11, 'ink'],
      tail: [18, 46, -122, 18, 30, 'ink'],
      body: [43, 40, 0, 44, 44, 'blue'],
      wing: [44, 34, -64, 32, 32, 'yellow'],
      head: [68, 18, 0, 24, 24, 'ink'],
      beak: [84.5, 19, 90, 9, 15, 'yellow'],
      eye: [72, 15, 0, 5, 5, 'paper'],
      quarter: [10, 16, 0, 22, 22, 'red'],
      tri2: [90, 62, 20, 12, 12, 'ink'],
      barA: [50, 88, 0, 66, 3, 'ink'],
      barB: [62, 93.5, 0, 36, 3, 'ink'],
      dot: [24, 80, 0, 8, 8, 'blue']
    },
    photo: {
      bg: 'yellow', sweep: [50, 52, 106, 'red'],
      card: [50, 52, 0, 76, 58, 'ink'],
      sq: [50, 52, 0, 66, 48, 'blue'],
      legL: [8, 27, 0, 3, 16, 'ink'],
      barA: [16, 19, 0, 16, 3, 'ink'],
      legR: [92, 77, 0, 3, 16, 'ink'],
      barB: [84, 85, 0, 16, 3, 'ink'],
      tail: [41, 62, 0, 38, 28, 'yellow'],
      body: [66, 39, 0, 19, 19, 'red'],
      wing: [64, 67, 0, 36, 36, 'paper'],
      head: [29, 38, 0, 7, 7, 'paper'],
      beak: [55, 69, 0, 16, 14, 'red'],
      eye: [56, 35, 0, 4, 4, 'paper'],
      quarter: [10, 90, 0, 17, 17, 'ink'],
      tri2: [92, 10, -30, 12, 12, 'ink'],
      dot: [94, 52, 0, 5, 5, 'ink']
    },
    hand: {
      bg: 'red', sweep: [38, 50, 100, 'yellow'],
      body: [34, 48, 0, 44, 44, 'paper'],
      eye: [34, 48, 0, 24, 24, 'red'],
      barB: [52.5, 48, 0, 9, 44, 'ink'],
      card: [72, 68, -40, 64, 11, 'yellow'],
      tail: [42, 93, -130, 12, 14, 'ink'],
      head: [97, 47, 0, 12, 12, 'ink'],
      barA: [32, 73.5, 0, 58, 3, 'paper'],
      legL: [4, 73.5, 0, 2.4, 10, 'paper'],
      legR: [60, 73.5, 0, 2.4, 10, 'paper'],
      wing: [17, 88, 0, 26, 26, 'yellow'],
      quarter: [88, 16, 0, 18, 18, 'paper'],
      tri2: [64, 14, 15, 10, 10, 'ink'],
      dot: [20, 12, 0, 7, 7, 'ink'],
      sq: [92, 88, 0, 9, 9, 'paper'],
      beak: [76, 88, 0, 11, 9, 'ink']
    },
    note: {
      bg: 'blue', sweep: [50, 52, 110, 'red'],
      card: [50, 50, 0, 80, 48, 'yellow'],
      body: [88, 14, 0, 34, 34, 'paper'],
      wing: [13, 84, 0, 30, 30, 'ink'],
      tail: [7, 14, 25, 22, 28, 'red'],
      head: [30, 90, 0, 11, 11, 'ink'],
      beak: [76, 90, 200, 9, 15, 'paper'],
      eye: [95, 58, 0, 6, 6, 'paper'],
      quarter: [93, 90, 180, 18, 18, 'ink'],
      tri2: [50, 12, -8, 14, 12, 'yellow'],
      sq: [3, 34, 15, 7, 7, 'red'],
      barA: [48, 80, 0, 52, 2.4, 'paper'],
      barB: [52, 85.5, 0, 34, 2.4, 'paper'],
      legL: [22, 82.5, 0, 2.4, 9, 'paper'],
      legR: [74, 82.5, 0, 2.4, 9, 'paper'],
      dot: [73, 8, 0, 6, 6, 'yellow'],
      noteX: 50, noteY: 50, noteW: 70
    },
    address: {
      bg: 'ink', sweep: [50, 50, 106, 'blue'],
      card: [50, 52, 0, 82, 52, 'yellow'],
      sq: [79, 35, 0, 11, 13, 'red'],
      head: [71, 36, 0, 14, 14, 'ink'],
      eye: [71, 36, 0, 9.5, 9.5, 'yellow'],
      legL: [72, 51, 0, 26, 2.3, 'ink'],
      legR: [72, 58, 0, 26, 2.3, 'ink'],
      barA: [72, 65, 0, 26, 2.3, 'ink'],
      barB: [66, 72, 0, 14, 2.3, 'ink'],
      body: [8, 10, 0, 38, 38, 'red'],
      wing: [88, 91, 0, 34, 34, 'red'],
      tail: [91, 9, 30, 14, 20, 'yellow'],
      beak: [46, 92, 0, 14, 11, 'yellow'],
      quarter: [10, 90, 0, 16, 16, 'paper'],
      tri2: [66, 90, 180, 10, 8, 'paper'],
      dot: [22, 92, 0, 6, 6, 'red'],
      noteX: 31, noteY: 52, noteW: 34
    }
  };

  /* ---------- geometry helpers ---------- */

  function px(scene, P) {
    /* Map every local state of a scene to screen px for a placement {cx, cy, k, rot}. */
    var out = { pieces: {}, sweep: null, note: null, bg: scene.bg };
    var rad = (P.rot || 0) * Math.PI / 180, c = Math.cos(rad), s = Math.sin(rad);
    function map(x, y) {
      var dx = (x - 50) * P.k, dy = (y - 50) * P.k;
      return [P.cx + dx * c - dy * s, P.cy + dx * s + dy * c];
    }
    PIECES.forEach(function (id) {
      var st = scene[id];
      var p = map(st[0], st[1]);
      var w = st[3], h = st[4] == null ? st[3] : st[4];
      out.pieces[id] = { x: p[0], y: p[1], r: st[2] + (P.rot || 0), sx: w * P.k, sy: h * P.k, fill: COL[st[5]] };
    });
    var sw = scene.sweep, sp = map(sw[0], sw[1]);
    out.sweep = { x: sp[0], y: sp[1], s: sw[2] * P.k, fill: COL[sw[3]] };
    if (scene.noteW) {
      var np = map(scene.noteX, scene.noteY);
      out.note = { x: np[0], y: np[1], r: P.rot || 0, s: scene.noteW * P.k / 563.2 };
    }
    return out;
  }

  function scatter(base, P, W, H, minX) {
    /* An exploded version of a composition: same pieces thrown outward, spun, kept on screen. */
    var out = { pieces: {}, sweep: null, note: base.note, bg: base.bg };
    var cx = P.cx, cy = P.cy;
    PIECES.forEach(function (id, i) {
      var b = base.pieces[id];
      var a = i * 2.399963 + 0.6;
      var d = (0.34 + ((i * 37) % 11) / 11 * 0.5) * 100 * P.k * 0.62;
      var x = b.x + Math.cos(a) * d, y = b.y + Math.sin(a) * d * 0.8;
      x = Math.max(minX + 40, Math.min(W - 30, x));
      y = Math.max(96, Math.min(H - 30, y));
      var dir = i % 2 ? 1 : -1;
      out.pieces[id] = { x: x, y: y, r: b.r + dir * (150 + ((i * 53) % 150)), sx: b.sx * 1.1, sy: b.sy * 1.1, fill: b.fill };
    });
    out.sweep = { x: base.sweep.x + P.k * 6, y: base.sweep.y + P.k * 8, s: base.sweep.s * 0.78, fill: base.sweep.fill };
    return out;
  }

  /* ---------- stage: builds the pieces into an <svg> ---------- */

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function makeStage(svg, opts) {
    opts = opts || {};
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var st = { svg: svg, fly: {}, pc: {}, path: {}, rot: {}, dir: {}, spin: null, note: null };
    ORDER.forEach(function (id, i) {
      var fly = el('g', { 'class': 'fly' }, svg);
      var pc = el('g', { 'class': 'pc', 'data-id': id }, fly);
      var path = el('path', { d: GEO[SHAPE[id]], fill: COL.paper }, pc);
      if (id === 'sweep') {
        /* invisible full-square bbox so the sweep pivots on the middle of its flat edge */
        var g = el('g', { 'class': 'spin' }, pc);
        g.appendChild(path);
        el('rect', { x: -.5, y: -.5, width: 1, height: 1, fill: 'none' }, g);
        st.spin = g;
      }
      st.fly[id] = fly; st.pc[id] = pc; st.path[id] = path; st.rot[id] = 0;
      st.dir[id] = [1, -1, 0, 1, -1, 1][i % 6];
    });
    if (opts.note) {
      var nf = el('g', { 'class': 'fly' }, svg);
      var ng = el('g', { 'class': 'note' }, nf);
      /* fixed bbox so the note pivots on its centre however the nib moves */
      el('rect', { x: -330, y: -150, width: 660, height: 300, fill: 'none' }, ng);
      var inner = el('g', { transform: 'translate(-281.6 -87.6)', fill: 'none', stroke: COL.ink,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, ng);
      var paths = [];
      opts.note.forEach(function (src) {
        var p = el('path', { d: src.d, 'stroke-width': src.w }, inner);
        paths.push(p);
      });
      /* a nib (pen tip) that follows the line while it is drawn */
      var nib = el('g', { 'class': 'nib', opacity: 0 }, ng);
      el('path', { d: 'M0 0L-5 -22L5 -22Z', fill: COL.ink, transform: 'translate(0 0) rotate(38) scale(1.6)' }, nib);
      st.note = { fly: nf, g: ng, paths: paths, nib: nib };
    }
    return st;
  }

  function stateOf(stage) { return stage; }

  /* Apply a px-state instantly. */
  function setState(stage, S) {
    PIECES.forEach(function (id) {
      var t = S.pieces[id];
      stage.rot[id] = t.r;
      gsap.set(stage.pc[id], { x: t.x, y: t.y, rotation: t.r, scaleX: t.sx, scaleY: t.sy, transformOrigin: '50% 50%' });
      stage.path[id].setAttribute('fill', t.fill);
    });
    gsap.set(stage.pc.sweep, { x: S.sweep.x, y: S.sweep.y, scale: S.sweep.s, transformOrigin: '50% 50%' });
    gsap.set(stage.spin, { transformOrigin: '50% 50%' });
    stage.path.sweep.setAttribute('fill', S.sweep.fill);
    if (stage.note && S.note) {
      gsap.set(stage.note.g, { x: S.note.x, y: S.note.y, rotation: S.note.r, scale: S.note.s, transformOrigin: '50% 50%' });
    }
  }

  /* Add tweens that carry the stage from its current state to S.
     `spin` adds a full extra turn to some pieces so they visibly rotate on the way. */
  function morph(tl, stage, S, at, dur, o) {
    o = o || {};
    PIECES.forEach(function (id, i) {
      var t = S.pieces[id];
      var cur = stage.rot[id];
      var r = t.r + 360 * Math.round((cur - t.r) / 360);
      if (o.spin) r += 360 * stage.dir[id];
      stage.rot[id] = r;
      var lag = (i / PIECES.length) * dur * 0.3;
      tl.to(stage.pc[id], { x: t.x, y: t.y, rotation: r, scaleX: t.sx, scaleY: t.sy,
        duration: dur * 0.7, ease: o.ease || 'power3.inOut' }, at + lag);
      tl.to(stage.path[id], { fill: t.fill, duration: dur * 0.45, ease: 'none' }, at + lag + dur * 0.1);
    });
    tl.to(stage.pc.sweep, { x: S.sweep.x, y: S.sweep.y, scaleX: S.sweep.s, scaleY: S.sweep.s,
      duration: dur * 0.8, ease: 'power2.inOut' }, at);
    tl.to(stage.path.sweep, { fill: S.sweep.fill, duration: dur * 0.5, ease: 'none' }, at + dur * 0.1);
    if (stage.note && S.note) {
      tl.to(stage.note.g, { x: S.note.x, y: S.note.y, rotation: S.note.r, scale: S.note.s,
        duration: dur * 0.8, ease: 'power3.inOut' }, at);
    }
  }

  window.PPScenes = {
    COL: COL, SCENES: SCENES, ORDER: ORDER, PIECES: PIECES,
    px: px, scatter: scatter, makeStage: makeStage, setState: setState, morph: morph
  };
})();
