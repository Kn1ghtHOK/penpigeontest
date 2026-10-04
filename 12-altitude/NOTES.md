# 12 Altitude

**Concept.** The whole page is one flight. A fixed paper-cut sky changes from dawn to midday to dusk to night as you scroll, flat layers parallax past, and a pigeon carries a postcard on a string from the sender's lit window to the recipient's mailbox. Content sits on cream cloud cards the pigeon flies past; the four steps are four waypoints.

**Palette.** Dawn peach `#f8c3a6`, sky blue `#4f9be0`, dusk violet `#62508f`, night navy `#0b0f2a`, warm cream cards `#fff3df`, navy ink `#1b2347`, one accent: airmail red `#d9482b` (step tabs, stamp, ticks). Sky is 5 flat wavy colour bands, repainted per time of day (no gradients).
**Fonts.** Gabarito (display, 700/800), Albert Sans (body), Caveat only for the sample handwriting sheets.

**Signature moment: the delivery run.** One paused master timeline (0..112) is driven by scroll through section anchors, eased toward the scroll target in a ticker. It carries:
- the pigeon on a `MotionPath` (autoRotate, damped into a bank angle) with a `CustomEase` built from waypoint times, so it sits beside each card on cue;
- the sky, sun/moon/stars, window lights and every parallax layer;
- mid-flight at midday, the card (hanging below) scales up, flips in 3D, and the real `hero-message.svg` strokes draw in at constant pen speed (DrawSVG, pen tip + stroke counter);
- then the pigeon lands on the mailbox at night, the stamp thumps down, the postmark inks, the flag rises.
Also: SplitText (hero lines, headings, handwriting letter boxes), ScrollTrigger.batch card reveals, scrubbed step visuals, `gsap.matchMedia` (motion / reduced / mobile).

**Reduced motion / no JS.** Static dawn hero with the pigeon on the sill, all cards visible, note already written and stamped, no HUD. If GSAP fails to load the page falls back to the same layout.

**Verified.** 1440x900, 390x844, 360, 1024, 1920: no horizontal scroll, no console errors; reduced-motion emulated.

**Port would still need.** Dark theme decision (page is one light theme with a night sky), real create/pricing/contact/legal pages, real link targets, a proper favicon set, and final art pass on the pigeon and houses. The sky repaints are CPU-painted on every scroll frame; fine here, worth profiling on low-end phones.

**Known flaws.**
- Pigeon passes behind cards (by design on mobile; on desktop lanes keep it clear down to about 1000px wide).
- Landing: the hanging card covers most of the mailbox body.
- Mobile HUD bar costs 70px of height; the footer slides over the ground at the end.
- Wing art is simplified and flap is a rotation, not a feather redraw.
- Layout uses 100svh sections plus a 360vh sticky runway (about 12 screens of scroll on desktop).
- Pages served over `file://` work; Google Fonts need internet.
