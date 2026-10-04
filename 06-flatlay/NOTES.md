# 06 Desk Flat-lay

**Concept.** The page is a walnut desk seen from straight above; every section is a set of objects lying on it (letter sheet, print with a white border, receipt, brass-edged member card, notepad, envelope, brass pen, ink bottle, stamp pad). Scrolling is a camera moving across the desk, and the product's real act, a pen drawing the note, happens on a postcard in the middle of the trip.

**Palette.** Walnut `#3a2417` / `#2a1a10`, linen paper `#e4e0d2` / `#f1eee5`, ink blue `#1d3c78` (writing) / `#14263f` (text), brass `#b8893b` (`#ecd08a` highlight), one stamp red `#b3261e`. Fonts: Young Serif (display), Special Elite (typewriter labels, buttons), Nanum Pen Script (small notes and the pangram samples only), Hanken Grotesk (body).

**Signature moment.** One pinned `.camera` over a 4040x5480 stage. A single scrubbed GSAP timeline (ScrollTrigger pin + scrub) animates a camera state object (x, y, zoom, roll); zone travel dips the zoom and rolls slightly. Layers at three depths parallax against the desk. In the pen zone the camera pushes in and a brass pen rides MotionPathPlugin along one combined path built from the 40 real `hero-message.svg` strokes (pen lifts included); each stroke's ink is a scrubbed dash tween timed by arc length, the shadow grows while the pen is lifted, a stroke counter updates, and a postmark thunks on at the end. Other GSAP: ScrollToPlugin (nav and focus jumps), SplitText (headline), DrawSVG (letter-detection boxes), ScrollTrigger.batch and matchMedia, animated `--lift` shadows on drop-ins.

**Modes.** `cam` (wide, motion ok), flow (phones, short windows: no pin, objects drop in as they arrive, pen writes as the card crosses the screen), reduced motion and no JS (flow layout, everything visible, note already written).

**To port.** Dark mode (the desk is already dark, paper would need a lamp-lit variant), the other pages, real photography for the print, real form controls, a real postcard front/back specimen, a proper mobile nav test on devices.

**Known flaws.** The pinned camera is about 11 screens of scroll, long for a homepage. Wood grain is SVG noise and a touch stripey. Zooming re-rasters the big stage, so low-end machines may drop frames during travel. Pen zone needs the Google fonts to match its measurements (falls back gracefully). Wide reduced-motion layout is a single centered column. Nav links to other pages are dead (`../../*.html`). Sample address, photo and note are fictional samples and labelled as such where shown as examples.
