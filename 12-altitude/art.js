/* Builds the flat paper-cut world (sky bands, clouds, hills, rooftops, street trees, stars).
   Plain script, no dependencies. Colours here are the dawn state; main.js repaints them over the flight. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var H = 400; // every layer is authored 400 units tall; width = aspect ratio * 400

  function rng(seed) {
    var a = seed;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function f(n) { return Math.round(n * 10) / 10; }
  function smooth(pts, W) {
    var d = 'M0,' + H + ' L' + f(pts[0][0]) + ',' + f(pts[0][1]);
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += ' Q' + f(pts[i][0]) + ',' + f(pts[i][1]) + ' ' + f(mx) + ',' + f(my);
    }
    var l = pts[pts.length - 1];
    return d + ' L' + f(l[0]) + ',' + f(l[1]) + ' L' + W + ',' + H + ' Z';
  }
  function svgFor(layer, ar) {
    var W = ar * H;
    var s = el('svg', { viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', focusable: 'false' });
    s.style.position = 'absolute'; s.style.inset = '0';
    layer.insertBefore(s, layer.firstChild);
    return { svg: s, W: W };
  }

  function sky() {
    var svg = document.getElementById('sky');
    var cols = ['#8e94cf', '#b9a6d6', '#eeb0c2', '#f8c3a6', '#fcdcae'];
    var tops = [0, 24, 45, 64, 80], amps = [0, 1.3, 1.7, 2.1, 2.5], ph = [0, 1.1, 2.4, .6, 1.9];
    cols.forEach(function (c, i) {
      var d = 'M0,' + tops[i];
      for (var k = 0; k <= 40; k++) {
        var x = k / 40 * 100;
        d += ' L' + f(x) + ',' + f(tops[i] + amps[i] * Math.sin(k / 40 * Math.PI * 2 * 1.4 + ph[i]));
      }
      d += ' L100,101 L0,101 Z';
      el('path', { d: d, fill: c, class: 'sky__band' }, svg);
    });
  }

  function stars() {
    var box = document.getElementById('stars'), r = rng(31);
    for (var i = 0; i < 70; i++) {
      var s = document.createElement('i');
      s.className = r() > .86 ? 's3' : r() > .6 ? 's2' : '';
      s.style.left = f(r() * 100) + '%'; s.style.top = f(r() * 100) + '%';
      box.appendChild(s);
    }
  }

  function cloud(g, x, y, s, r) {
    var w = 190 * s, h = 46 * s;
    var cg = el('g', {}, g);
    el('rect', { x: f(x), y: f(y - h * .35), width: f(w), height: f(h * .8), rx: f(h * .4) }, cg);
    var n = 3 + Math.floor(r() * 2);
    for (var i = 0; i < n; i++) {
      var cx = x + w * (.2 + .6 * (i / (n - 1))) + (r() - .5) * 10 * s;
      var rad = h * (.55 + r() * .55) * (i === 1 ? 1.15 : .9);
      el('circle', { cx: f(cx), cy: f(y - h * .1 - (i === 1 ? h * .2 : 0)), r: f(rad) }, cg);
    }
  }
  function clouds(layer, ar, seed, count, minS, maxS, yMin, yMax) {
    var o = svgFor(layer, ar), r = rng(seed), g = el('g', { class: 'fill' }, o.svg);
    for (var i = 0; i < count; i++) {
      var x = (i + .15 + r() * .7) * (o.W / count);
      var y = yMin + r() * (yMax - yMin);
      cloud(g, x, y, minS + r() * (maxS - minS), r);
    }
    o.svg.style.fill = '#fbd0c6';
  }

  function hills(layer, ar, seed, base, amp, freq, fill) {
    var o = svgFor(layer, ar), r = rng(seed), pts = [], p1 = r() * 6, p2 = r() * 6, p3 = r() * 6;
    for (var x = 0; x <= o.W + 40; x += 36) {
      var y = H - base - amp * (.5 + .32 * Math.sin(x * freq + p1) + .2 * Math.sin(x * freq * 2.3 + p2) + .1 * Math.sin(x * freq * 5.1 + p3));
      pts.push([x, y]);
    }
    el('path', { d: smooth(pts, o.W), class: 'fill' }, o.svg);
    o.svg.style.fill = fill;
  }

  function town(layer, ar, seed) {
    var o = svgFor(layer, ar), r = rng(seed);
    var back = el('g', { class: 'town-back' }, o.svg), front = el('g', { class: 'town-front' }, o.svg), win = el('g', { class: 'win' }, o.svg);
    back.style.fill = '#8c7bb0'; front.style.fill = '#6c5f98'; win.style.fill = '#ffd58a';
    function building(g, x, w, h, withWin) {
      var y = H - h, roof = r();
      el('rect', { x: f(x), y: y, width: f(w), height: h + 2 }, g);
      if (roof < .42) el('polygon', { points: [f(x - 4), y, f(x + w / 2), f(y - w * .38), f(x + w + 4), y].join(' ') }, g);
      else if (roof < .62) el('polygon', { points: [f(x - 4), y, f(x + w * .15), f(y - 22), f(x + w * .85), f(y - 22), f(x + w + 4), y].join(' ') }, g);
      else if (roof < .8) el('rect', { x: f(x + w * .62), y: y - 26, width: 14, height: 28 }, g);
      else el('polygon', { points: [f(x), y, f(x + w), f(y - 18), f(x + w), y].join(' ') }, g);
      if (withWin) {
        var cols = Math.max(2, Math.floor((w - 16) / 24)), rows = Math.floor((h - 26) / 36);
        for (var cI = 0; cI < cols; cI++) for (var rI = 0; rI < rows; rI++) {
          if (r() < .28) continue;
          el('rect', { x: f(x + 10 + cI * ((w - 20) / cols) + 2), y: f(y + 14 + rI * 36), width: 9, height: 14, rx: 1.5 }, win);
        }
      }
    }
    var x = -20;
    while (x < o.W) { var w = 70 + r() * 90; building(back, x, w, 70 + r() * 110, false); x += w * (.55 + r() * .3); }
    x = 0;
    while (x < o.W) {
      var w2 = 64 + r() * 96;
      if (r() < .1) { // church spire
        el('rect', { x: f(x), y: H - 190, width: 46, height: 192 }, front);
        el('polygon', { points: [f(x - 6), H - 190, f(x + 23), H - 290, f(x + 52), H - 190].join(' ') }, front);
        x += 56;
      } else { building(front, x, w2, 60 + r() * 130, true); x += w2 + 2 + r() * 10; }
    }
  }

  function street(layer, ar, seed) {
    var o = svgFor(layer, ar), r = rng(seed);
    var trees = el('g', { class: 'trees' }, o.svg), glow = el('g', { class: 'glow' }, o.svg);
    trees.style.fill = '#3f3a72'; glow.style.fill = '#ffd98a'; glow.style.opacity = '0';
    var x = 1000;
    while (x < o.W - 1700) {
      var k = r();
      if (k < .5) { // tree
        var s = .8 + r() * .8, th = 70 * s;
        el('rect', { x: f(x - 5 * s), y: f(H - th - 8), width: f(10 * s), height: f(th) }, trees);
        el('circle', { cx: f(x), cy: f(H - th - 24 * s), r: f(36 * s) }, trees);
        el('circle', { cx: f(x - 22 * s), cy: f(H - th - 4 * s), r: f(24 * s) }, trees);
        el('circle', { cx: f(x + 22 * s), cy: f(H - th - 8 * s), r: f(26 * s) }, trees);
        x += 170 + r() * 260;
      } else if (k < .78) { // fence run
        var n = 10 + Math.floor(r() * 10);
        el('rect', { x: f(x), y: H - 46, width: n * 13, height: 5 }, trees);
        for (var i = 0; i < n; i++) el('rect', { x: f(x + i * 13), y: H - 62, width: 7, height: 62 }, trees);
        x += n * 13 + 120 + r() * 200;
      } else if (k < .9) { // lamp
        el('rect', { x: f(x), y: H - 190, width: 7, height: 190 }, trees);
        el('path', { d: 'M' + f(x - 12) + ',' + (H - 188) + 'h31l-6-14h-19z' }, trees);
        el('circle', { cx: f(x + 3.5), cy: H - 190, r: 64 }, glow);
        x += 340 + r() * 300;
      } else { // bush
        var bw = 70 + r() * 80;
        el('ellipse', { cx: f(x + bw / 2), cy: H, rx: f(bw / 2), ry: f(34 + r() * 20) }, trees);
        x += bw + 90 + r() * 200;
      }
    }
  }

  function build() {
    sky(); stars();
    var L = function (k) { return document.querySelector('[data-layer="' + k + '"]'); };
    clouds(L('cloudsF'), 14, 11, 16, .7, 1.25, 120, 260);
    clouds(L('cloudsM'), 14, 23, 11, 1.3, 2.2, 140, 300);
    hills(L('hillsF'), 7, 5, 70, 190, .0042, '#b09ac8');
    hills(L('hillsM'), 10, 9, 40, 150, .0036, '#8a79ad');
    town(L('town'), 16, 17);
    street(L('street'), 14, 3);
    var fill = document.querySelector('.street__fill');
    if (fill) fill.style.background = '#2e2a5c';
  }
  window.PPArt = { build: build };
  build();
})();
