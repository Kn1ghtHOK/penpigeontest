/* plotcore.js: pure, DOM-free model of the sample plot.
   Takes the SVG path data of the real note, maps it onto the plotter bed and
   the postcard (mm, Y up), and builds the G-code program in the same shape as
   js/lib/gcode.js (G0 travel, M3 S1000 pen down, G4 P0.150, G1 F2200 segments,
   M5 pen up). Every readout on the page comes from here. Works as a classic
   script (window.PlotCore) and under node (module.exports). */
(function (root) {
  'use strict';

  // note (SVG user units) -> bed (SVG units of the bed viewBox)
  var NOTE = { scale: 0.93, tx: 48, ty: 128 };
  // the card on the bed: 6 x 4 in, 600 x 400 bed units, top-left at (20,20)
  var CARD = { x: 20, y: 20, w: 600, h: 400, wMm: 152.4, hMm: 101.6 };
  var MM = CARD.wMm / CARD.w; // mm per bed unit
  var FEED = 2200, TRAVEL = 4500, DWELL = 0.15; // from js/lib/gcode.js defaults

  function parse(d) {
    var nums = d.match(/-?\d+(?:\.\d+)?/g).map(Number), pts = [];
    for (var i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
    return pts;
  }
  function toBed(p) { return [NOTE.tx + p[0] * NOTE.scale, NOTE.ty + p[1] * NOTE.scale]; }
  function toMm(b) { return [(b[0] - CARD.x) * MM, (CARD.y + CARD.h - b[1]) * MM]; }
  function fmt(n) {
    var s = n.toFixed(3);
    if (s.indexOf('.') > -1) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s === '-0' ? '0' : s;
  }
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  function lerp(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }

  function build(dList) {
    var strokes = dList.map(function (d) { return parse(d).map(toBed); });
    var segs = [];      // {t0,t1,kind,a,b,stroke}  positions in bed units
    var lines = [];     // {t,text}
    var strokeStart = []; // {t0,t1,len} draw intervals, per stroke
    var t = 0, pos = [CARD.x, CARD.y + CARD.h], points = 0;
    var vfeed = FEED / 60, vtravel = TRAVEL / 60; // mm per second

    strokes.forEach(function (pts, si) {
      var start = pts[0];
      var travelMm = dist(pos, start) * MM, tt = travelMm / vtravel;
      var m = toMm(start);
      lines.push({ t: t, text: 'G0 F' + TRAVEL + ' X' + fmt(m[0]) + ' Y' + fmt(m[1]) });
      segs.push({ t0: t, t1: t + tt, kind: 'travel', a: pos, b: start, stroke: si });
      t += tt; pos = start;
      lines.push({ t: t, text: 'M3 S1000' });
      segs.push({ t0: t, t1: t + DWELL, kind: 'dwell', a: pos, b: pos, stroke: si, down: true });
      t += DWELL; lines.push({ t: t, text: 'G4 P' + DWELL.toFixed(3) });
      var t0 = t;
      for (var i = 1; i < pts.length; i++) {
        var seg = dist(pts[i - 1], pts[i]) * MM / vfeed;
        segs.push({ t0: t, t1: t + seg, kind: 'draw', a: pts[i - 1], b: pts[i], stroke: si });
        t += seg;
        var mm2 = toMm(pts[i]);
        lines.push({ t: t, text: 'G1 F' + FEED + ' X' + fmt(mm2[0]) + ' Y' + fmt(mm2[1]) });
        points += 1;
      }
      strokeStart.push({ t0: t0, t1: t });
      lines.push({ t: t, text: 'M5' });
      segs.push({ t0: t, t1: t + DWELL, kind: 'dwell', a: pos = pts[pts.length - 1], b: pos, stroke: si, down: false });
      t += DWELL; lines.push({ t: t, text: 'G4 P' + DWELL.toFixed(3) });
    });
    // park the pen
    var home = [CARD.x, CARD.y + CARD.h], pk = dist(pos, home) * MM / vtravel;
    lines.push({ t: t, text: 'G0 F' + TRAVEL + ' X0 Y0' });
    segs.push({ t0: t, t1: t + pk, kind: 'travel', a: pos, b: home, stroke: strokes.length - 1, park: true });
    t += pk; lines.push({ t: t, text: 'M2 ; program end' });

    var header = [
      '; PenPigeon message G-code',
      '; strokes: ' + strokes.length + '   segments: ' + points,
      'G21 ; units: mm',
      'G90 ; absolute positioning',
      'M5'
    ];

    function stateAt(time) {
      time = Math.max(0, Math.min(t, time));
      var lo = 0, hi = segs.length - 1;
      while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (segs[mid].t0 <= time) lo = mid; else hi = mid - 1; }
      var s = segs[lo], k = s.t1 > s.t0 ? Math.min(1, (time - s.t0) / (s.t1 - s.t0)) : 1;
      var p = lerp(s.a, s.b, k);
      var done = 0;
      for (var i = 0; i < strokeStart.length; i++) { if (strokeStart[i].t0 <= time) done = i + 1; else break; }
      var down = (s.kind === 'draw') || (s.kind === 'dwell' && s.down);
      var count = 0; // lines emitted by `time`
      var a = 0, b = lines.length;
      while (a < b) { var m = (a + b) >> 1; if (lines[m].t <= time) a = m + 1; else b = m; }
      count = a;
      var mm = toMm(p);
      return { bed: p, x: mm[0], y: mm[1], down: down, stroke: done, count: count, kind: s.kind, time: time };
    }

    return {
      strokes: strokes, header: header, lines: lines, total: t, strokeStart: strokeStart,
      count: strokes.length, points: points, stateAt: stateAt, fmt: fmt,
      note: NOTE, card: CARD
    };
  }

  var api = { build: build, NOTE: NOTE, CARD: CARD, FEED: FEED, TRAVEL: TRAVEL };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.PlotCore = api;
})(typeof window !== 'undefined' ? window : this);
