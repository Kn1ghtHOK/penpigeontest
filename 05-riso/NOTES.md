# 05 Riso Zine

A risograph-printed zine. Three inks (fluorescent pink, blue, yellow) plus black overprint with `mix-blend-mode: multiply` on off-white uncoated stock, with halftone dots, hand-cut ragged paper shapes, deliberate misregistration and two staples on the spine. Pages turn between spreads with scrubbed clip-path wipes.

**Palette:** paper `#eeece2`, card stock `#f7f4ea`, black ink `#17151f`, pink `#ff4b9f`, blue `#1ea0e6`, yellow `#ffdc1c`.
**Fonts:** Bagel Fat One (display), DM Mono (body, labels), Reenie Beanie (only for the sample handwriting sheets).

**Signature moment: ink layers come into register.**
- Hero: the pigeon is four SVG plates (blue, pink, yellow, black key) that start offset and blurred, then scrub into perfect register while the hero pins. Headline ghosts, the yellow marker bar and the pink halftone sun converge too, and a readout flips from "Off register" to "In register".
- Card: a pinned stage. The sample photo's three plates register, the front card slides off, the real `hero-message.svg` note is drawn stroke by stroke in black (DrawSVG, 40 paths) with a plotter pen tracking the tip and a "stroke n of 40" readout, then the stamp thunks on (CustomEase).
- Everything else: ScrollTrigger scrub (halftone canvas dot gain, clip-path wipes, plate offsets), `enter` reveals, SplitText char boxes on the handwriting sheets, MotionPath for the closing pigeon along a dotted pen path.

**Reduced motion / no JS:** all reveals live in `gsap.matchMedia()` (no-preference branch). Default CSS shows everything finished: plates in register, both postcard faces in flow, note fully drawn, no clip-paths.

**A real port would still need:** dark mode (the stock and flood colours have no dark twin; probably a "black stock" variant), the other pages in this look, real photo upload and crop in place of the SVG sample photo, real sample cards of mailed work, and font self-hosting (Google Fonts links are for exploration).

**Known flaws:**
- Grain, speckle and multiply layers cost paint time on low-end phones; the hero blur is the heaviest piece.
- The wipes reveal paper behind the clipped section, so mid-scroll you briefly see a half-turned page by design.
- Pinned hero is desktop only; on phones it registers over the first half screen of scroll.
- Hand-cut shapes are generated clip-path polygons, so edges differ slightly by element size.
- Handwriting sheet font is a sample, not a trace of any real engine output.
- Tested in Chromium only.
