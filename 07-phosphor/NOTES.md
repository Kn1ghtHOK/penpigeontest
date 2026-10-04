# 07 Phosphor: the plotter's own console

**Concept.** The homepage is a terminal session on the plotter's CRT: one amber phosphor colour on black, everything monospace, ASCII frames, shell prompts and file listings, with the real brief copy as the output you read. Pricing prints as receipts, the FAQ is a `man` page you open with the keyboard.

**Palette (hex).** Ground `#0a0702` / `#120c03` / `#1a1205`. One hue, brightness is the hierarchy: hot `#ffd36a`, phosphor `#ffb000`, dim `#b9820b` (5.8:1 text), line `#8a6208` (borders only). Radius 0 everywhere.
**Fonts.** VT323 (display, step titles, numbers), Share Tech Mono (body, 17px). Fallback: ui-monospace/Menlo/Consolas.

**Signature moment: the G-code stream** (`#made`, desktop ~360vh of sticky scroll, CSS sticky not a hijack).
One scrubbed GSAP timeline (ScrollTrigger scrub) does three things from one schedule:
- types the four steps into the session pane (clip-path wipes with `steps(n)` ease, real text stays in the DOM; a shared cursor rides the leading edge),
- draws the real `hero-message.svg` stroke by stroke on the plotter bed (DrawSVGPlugin, 40 paths in pen order, pen head follows the path),
- scrolls a `G0/G1/M3/M5` readout whose X/Y numbers come from `plotcore.js`, which maps the actual path points to a 6x4 in card (same command shape as `js/lib/gcode.js`). The readout, X/Y/pen/stroke counters and DrawSVG all share that model.
Then the address lines rule in and a "PENPIGEON PROCESSED" postmark lands.
Other GSAP: ScrambleText (hero lede, h2 and FAQ answer decode), SplitText (letter-detection boxes in the handwriting demo, scrubbed), batch/once triggers, clip-path "printing" for the receipts, scrubbed pigeon fly-in. Boot sequence ~1.7s, skippable by any key or click, skipped entirely under reduced motion.

**Reduced motion / no JS.** Static page is the finished state: every line typed, note fully drawn, postmark down, readout parked at program end. A "CRT effects" toggle (nav) turns off scanlines, glow, flicker and cursor blink.
**Mobile (390).** No pin: steps flow as a normal terminal, then the plot panel sticks under the nav and scrubs while a spacer scrolls.

**A real port would still need:** the other pages in this language, a light/other-theme answer (this is a single dark theme), real form styling (inputs, error states) in the console idiom, measured text/scanline contrast on real displays, the sticky scene tested on short laptop viewports (<700px tall), and the sample note swapped for the visitor's own text.

**Known flaws.** Scene is verified only in Chromium. The ASCII/pixel pigeons read as pigeons but are chunky. On very short desktop windows the plot readout shrinks the bed (letterboxed). Scanlines slightly lower effective contrast; toggle exists. Only the viewport size at load is wrapped for the typed lines (resize re-wraps after 320ms). The page needs HTTP or file:// with `../_shared/gsap` beside it.
